import "server-only";

/**
 * Pasarela de pagos del abono, detrás de una interfaz pequeña para que el
 * resto del sitio no dependa de un proveedor.
 *
 * Proveedor definitivo: Wompi (pendiente de integrar, con las llaves del
 * salón). Para integrarlo:
 *   1. `pasarelaActiva()` devuelve "WOMPI" cuando existan WOMPI_PUBLIC_KEY y
 *      WOMPI_INTEGRITY_SECRET.
 *   2. `iniciarCobro()` arma la URL del Web Checkout (public-key, currency,
 *      amount-in-cents, reference, signature:integrity, redirect-url y
 *      expiration-time = fin del cupo apartado) y la devuelve como redirect.
 *   3. `consultarCobro()` pregunta a /v1/transactions?reference=… y traduce
 *      el estado (APPROVED, DECLINED, VOIDED, ERROR, PENDING).
 *   4. Un webhook en /api/wompi/webhook valida el checksum del evento y llama
 *      a registrarPagoAprobado/Rechazado/Anulado de src/lib/pagos.ts.
 * La pantalla de retorno (/reservar/pago/[codigo]) ya concilia con
 * `consultarCobro()` si el webhook no ha llegado.
 *
 * Mientras tanto existe el modo de PRUEBA (PAGOS_DE_PRUEBA="true"): no cobra
 * nada y muestra botones para simular un pago aprobado o rechazado. Sirve para
 * revisar y mostrar el flujo completo. Nunca se deja encendido con una
 * pasarela real.
 */

export type Pasarela = "PRUEBA";

export function pasarelaActiva(): Pasarela | null {
  if (process.env.PAGOS_DE_PRUEBA === "true") return "PRUEBA";
  return null;
}

export type Cobro = {
  referencia: string;
  monto: number;
  descripcion: string;
  /** A dónde vuelve la clienta después de pagar. */
  urlRetorno: string;
  /** Después de esto la pasarela no debe aceptar el pago (fin del cupo). */
  expira: Date;
  cliente: { nombre: string; correo: string | null; telefono: string };
};

export type InicioCobro = { tipo: "redirect"; url: string } | { tipo: "prueba"; referencia: string };

export async function iniciarCobro(cobro: Cobro): Promise<InicioCobro> {
  const pasarela = pasarelaActiva();
  if (pasarela === "PRUEBA") return { tipo: "prueba", referencia: cobro.referencia };
  throw new Error("No hay pasarela de pagos configurada.");
}

export type EstadoCobro = {
  estado: "APROBADO" | "RECHAZADO" | "ANULADO" | "PENDIENTE";
  transaccionId?: string | null;
  metodo?: string | null;
  correo?: string | null;
};

/** Estado de un cobro según la pasarela; null si no hay a quién preguntar. */
export async function consultarCobro(referencia: string): Promise<EstadoCobro | null> {
  void referencia;
  // El modo de prueba no tiene a quién preguntar: el estado lo fija la
  // simulación directamente en la base.
  return null;
}
