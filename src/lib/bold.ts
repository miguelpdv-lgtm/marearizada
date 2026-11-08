import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Todo el contacto con Bold, la pasarela que cobra los pedidos de la tienda y
 * los abonos de las citas.
 *
 * Se usa el "botón de pagos": el checkout lo aloja Bold, así que por aquí
 * nunca pasan datos de tarjeta. Lo que sí pasa —y es lo delicado— es el monto:
 * viaja al navegador dentro de un atributo HTML. Para que nadie lo edite antes
 * de pagar, Bold exige una firma de integridad que ata referencia + monto +
 * moneda a la llave secreta. De ahí que el monto se calcule siempre en el
 * servidor y jamás se acepte el que proponga el carrito.
 */

/** Bold no procesa cobros por debajo de $1.000 COP. */
export const MONTO_MINIMO = 1000;

const MONEDA = "COP";

const API_COMPROBANTES = "https://payments.api.bold.co/v2/payment-voucher";

/** Llave de identidad: pública por diseño, viaja en `data-api-key`. */
function llaveIdentidad() {
  return process.env.BOLD_IDENTITY_KEY ?? "";
}

/** Llave secreta: firma los cobros. Nunca sale del servidor. */
function llaveSecreta() {
  return process.env.BOLD_SECRET_KEY ?? "";
}

/**
 * Con qué se valida la firma del webhook. En el ambiente de prueba Bold firma
 * con cadena vacía, por eso es una variable aparte y por eso se distingue
 * "vacía" de "sin configurar".
 */
function llaveWebhook() {
  const propia = process.env.BOLD_WEBHOOK_SECRET;
  return propia === undefined ? llaveSecreta() : propia;
}

/**
 * Una llave vacía no protege nada: el HMAC de cualquier cuerpo lo puede
 * calcular cualquiera, y aceptar ese webhook significa dar por pagado un
 * pedido que nadie pagó —con descuento de inventario y factura timbrada ante
 * la DIAN detrás—. En pruebas se tolera porque Bold firma así a propósito;
 * en producción es una puerta abierta, y se cierra.
 */
export function webhookConfiable() {
  return process.env.NODE_ENV !== "production" || llaveWebhook() !== "";
}

/** Si no hay llaves, la tienda y los abonos se comportan como si no existieran. */
export function boldConfigurado() {
  return llaveIdentidad() !== "" && llaveSecreta() !== "";
}

/**
 * Firma de integridad: SHA-256 de {referencia}{monto}{moneda}{llave secreta}.
 * El orden importa; si algo no coincide con lo que llega en los atributos,
 * Bold rechaza la transacción antes de pedirle un peso a la clienta.
 */
export function firmaIntegridad(referencia: string, monto: number) {
  return createHash("sha256")
    .update(`${referencia}${monto}${MONEDA}${llaveSecreta()}`)
    .digest("hex");
}

export type ClienteBold = {
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
};

export type DireccionBold = {
  direccion: string;
  ciudad: string;
  departamento: string;
};

/**
 * La forma exacta que espera `new window.BoldCheckout({ ... })` en el
 * navegador. No es HTML: es la "integración personalizada" de Bold, que
 * dispara el pago con `checkout.open()` en vez de que su script escanee la
 * página buscando un `<div data-bold-button>`.
 *
 * Se usa esta variante y no el botón declarativo porque acá el pedido —y por
 * lo tanto la configuración del pago— nace recién cuando la clienta hace
 * clic en "Ir a pagar", mucho después de que la página ya cargó. El botón
 * declarativo solo funciona si Bold encuentra el div al momento de ejecutar
 * su script; con `BoldCheckout` el script se carga una sola vez al entrar a
 * la página, y `.open()` se puede llamar en cualquier momento después.
 */
export type ConfigCheckout = {
  orderId: string;
  currency: string;
  amount: string;
  apiKey: string;
  integritySignature: string;
  description: string;
  redirectionUrl: string;
  renderMode: string;
  customerData?: string;
  billingAddress?: string;
};

export function configCheckout({
  referencia,
  monto,
  descripcion,
  urlRetorno,
  cliente,
  direccion,
}: {
  referencia: string;
  monto: number;
  descripcion: string;
  urlRetorno: string;
  cliente?: ClienteBold;
  direccion?: DireccionBold | null;
}): ConfigCheckout {
  const config: ConfigCheckout = {
    orderId: referencia,
    currency: MONEDA,
    amount: String(monto),
    apiKey: llaveIdentidad(),
    integritySignature: firmaIntegridad(referencia, monto),
    // Bold exige entre 2 y 100 caracteres.
    description: descripcion.slice(0, 100),
    redirectionUrl: urlRetorno,
    renderMode: "embedded",
  };

  if (cliente) {
    config.customerData = JSON.stringify({
      fullName: cliente.nombre,
      ...(cliente.correo ? { email: cliente.correo } : {}),
      ...(cliente.telefono
        ? { phone: cliente.telefono.replace(/\D/g, ""), dialCode: "+57" }
        : {}),
    });
  }

  if (direccion) {
    config.billingAddress = JSON.stringify({
      address: direccion.direccion,
      city: direccion.ciudad,
      state: direccion.departamento,
      country: "CO",
    });
  }

  return config;
}

/**
 * Estados que devuelve Bold. `NO_TRANSACTION_FOUND` no es un error: significa
 * que la clienta abrió el checkout y todavía no ha intentado pagar.
 */
export type EstadoBold =
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "VOIDED"
  | "PROCESSING"
  | "PENDING"
  | "NO_TRANSACTION_FOUND";

export type Comprobante = {
  estado: EstadoBold;
  transactionId: string | null;
  metodo: string | null;
  correo: string | null;
  total: number | null;
};

/**
 * Consulta el estado de un cobro por su referencia. Es la red de seguridad
 * cuando el webhook no llega: la pantalla de retorno pregunta directamente y
 * cierra el pedido igual. En desarrollo local, sin URL pública, es el único
 * camino que funciona.
 */
export async function consultarTransaccion(
  referencia: string,
): Promise<Comprobante | null> {
  if (!boldConfigurado()) return null;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_COMPROBANTES}/${encodeURIComponent(referencia)}`, {
      headers: { Authorization: `x-api-key ${llaveIdentidad()}` },
      cache: "no-store",
    });
  } catch {
    // Bold caído o sin red: quien llame decide si reintenta.
    return null;
  }

  if (respuesta.status === 404) {
    return {
      estado: "NO_TRANSACTION_FOUND",
      transactionId: null,
      metodo: null,
      correo: null,
      total: null,
    };
  }
  if (!respuesta.ok) return null;

  const json = (await respuesta.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!json) return null;

  // Bold envuelve la respuesta en `payload` en unos endpoints y no en otros.
  const cuerpo = (json.payload ?? json) as Record<string, unknown>;
  const estado = cuerpo.payment_status;
  if (typeof estado !== "string") return null;

  return {
    estado: estado as EstadoBold,
    transactionId:
      typeof cuerpo.transaction_id === "string" ? cuerpo.transaction_id : null,
    metodo: typeof cuerpo.payment_method === "string" ? cuerpo.payment_method : null,
    correo: typeof cuerpo.payer_email === "string" ? cuerpo.payer_email : null,
    total: typeof cuerpo.total === "number" ? cuerpo.total : null,
  };
}

/**
 * Valida que una notificación venga de verdad de Bold: HMAC-SHA256 del cuerpo
 * en base64, con la llave secreta, en hexadecimal. Se compara en tiempo
 * constante para no filtrar la firma correcta byte a byte.
 *
 * `cuerpoCrudo` tiene que ser el texto exacto que llegó; si se reserializa el
 * JSON cambia un espacio y la firma deja de cuadrar.
 */
export function verificarFirmaWebhook(cuerpoCrudo: string, firmaRecibida: string | null) {
  if (!firmaRecibida) return false;

  const esperada = createHmac("sha256", llaveWebhook())
    .update(Buffer.from(cuerpoCrudo, "utf8").toString("base64"))
    .digest("hex");

  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(firmaRecibida.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
