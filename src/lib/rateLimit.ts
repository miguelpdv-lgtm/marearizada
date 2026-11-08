import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/db";

/**
 * Freno de intentos para el login y para las acciones públicas.
 *
 * Qué defiende cada uno:
 *
 *   · **login** — `/admin` está enlazado desde el pie del sitio, así que la
 *     puerta es pública y probar contraseñas sale gratis. Se limita por correo
 *     (para que no machaquen una cuenta concreta) y por IP (para que no barran
 *     la lista de correos).
 *   · **reserva / pedido** — escriben en la base sin sesión. Un script llena
 *     la agenda de citas falsas en minutos y deja al salón limpiando a mano.
 *
 * El contador vive en la base (`RateLimit`) y no en memoria porque en
 * serverless cada instancia tendría el suyo, y con suficientes instancias en
 * paralelo un límite local no frena nada.
 *
 * Nada de esto es antifraude serio: quien tenga muchas IPs pasa igual. Es la
 * diferencia entre un script de una tarde y algo que cuesta montar, que para
 * este sitio es justo la barrera que hace falta.
 */

export type Limite = {
  /** Cuántos intentos se permiten dentro de la ventana. */
  tope: number;
  /** Tamaño de la ventana, en segundos. */
  ventana: number;
  /** Cuánto se queda frenado tras pasarse del tope, en segundos. */
  bloqueo: number;
};

export const LIMITES = {
  /** 5 intentos fallidos por correo en 15 min → 15 min de espera. */
  login: { tope: 5, ventana: 900, bloqueo: 900 },
  /** Más holgado: una oficina entera puede compartir IP. */
  "login-ip": { tope: 20, ventana: 900, bloqueo: 900 },
  /** 5 citas por IP en una hora es mucho más de lo que reserva una persona. */
  reserva: { tope: 5, ventana: 3600, bloqueo: 3600 },
  /** Probar cupones: frena a quien intenta adivinar códigos. */
  cupon: { tope: 12, ventana: 900, bloqueo: 900 },
  /** Reseñas: una por cita, pero se frena el envío en masa desde una IP. */
  resena: { tope: 8, ventana: 3600, bloqueo: 3600 },
  /** Los pedidos se reintentan más (pagos que fallan), así que va más suelto. */
  pedido: { tope: 10, ventana: 3600, bloqueo: 3600 },
  /** Buscar una cita por código y celular: frena a quien adivina códigos. */
  "cita-buscar": { tope: 10, ventana: 900, bloqueo: 1800 },
  /** Que la clienta mueva su cita: un par de veces es normal, decenas no. */
  "cita-cambiar": { tope: 5, ventana: 3600, bloqueo: 3600 },
  /** Suscribirse al boletín: nadie legítimo lo hace más de un par de veces. */
  boletin: { tope: 5, ventana: 3600, bloqueo: 3600 },
} as const satisfies Record<string, Limite>;

export type Accion = keyof typeof LIMITES;

export type Resultado =
  | { ok: true }
  | { ok: false; segundos: number };

/**
 * La IP de quien llama, según las cabeceras del proxy. Vercel pone
 * `x-forwarded-for`; el primer valor de la lista es el cliente real y el resto
 * son saltos intermedios.
 *
 * Devuelve "desconocida" si no hay cabecera: en local no la hay, y es mejor
 * que todos compartan cubo a que el límite se apague solo.
 */
export async function ipDeLaPeticion() {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "desconocida";
}

/**
 * Cuenta un intento y dice si se puede seguir.
 *
 * Se llama ANTES de hacer el trabajo. Para el login hay que devolver el crédito
 * cuando la contraseña sí era correcta — si no, cinco entradas legítimas
 * seguidas dejarían a alguien afuera; de eso se encarga `perdonar()`.
 */
export async function consumir(accion: Accion, llave: string): Promise<Resultado> {
  const limite = LIMITES[accion];
  const ahora = new Date();

  const fila = await prisma.rateLimit.findUnique({
    where: { action_key: { action: accion, key: llave } },
  });

  if (fila?.blockedUntil && fila.blockedUntil > ahora) {
    return {
      ok: false,
      segundos: Math.ceil((fila.blockedUntil.getTime() - ahora.getTime()) / 1000),
    };
  }

  // Ventana vencida (o primera vez): el contador arranca de cero.
  const vencida =
    !fila || ahora.getTime() - fila.windowAt.getTime() > limite.ventana * 1000;

  if (vencida) {
    await prisma.rateLimit.upsert({
      where: { action_key: { action: accion, key: llave } },
      create: { action: accion, key: llave, count: 1, windowAt: ahora },
      update: { count: 1, windowAt: ahora, blockedUntil: null },
    });
    return { ok: true };
  }

  const nuevo = fila.count + 1;
  const pasado = nuevo > limite.tope;

  await prisma.rateLimit.update({
    where: { id: fila.id },
    data: {
      count: nuevo,
      blockedUntil: pasado
        ? new Date(ahora.getTime() + limite.bloqueo * 1000)
        : null,
    },
  });

  return pasado ? { ok: false, segundos: limite.bloqueo } : { ok: true };
}

/**
 * Borra el contador de una llave. Se usa cuando el intento resultó legítimo
 * (un login correcto), para que usar bien el sitio nunca acerque al bloqueo.
 */
export async function perdonar(accion: Accion, llave: string) {
  await prisma.rateLimit
    .delete({ where: { action_key: { action: accion, key: llave } } })
    .catch(() => {
      // No existía. Es el caso normal la primera vez.
    });
}

/** "15 minutos", "45 segundos" — para decírselo a la persona, no al log. */
export function esperaLegible(segundos: number) {
  if (segundos < 60) return `${segundos} segundos`;
  const minutos = Math.ceil(segundos / 60);
  return minutos === 1 ? "un minuto" : `${minutos} minutos`;
}
