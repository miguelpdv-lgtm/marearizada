import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { consultarTransaccion } from "@/lib/bold";
import { avisarAbonoRecibido } from "@/lib/correo/avisos";

/**
 * Qué pasa cuando Bold dice que un cobro se aprobó.
 *
 * Hay dos caminos que traen esa noticia y ninguno es confiable por sí solo:
 * el webhook (que puede llegar cinco veces, o nunca) y la pantalla de retorno
 * (que solo existe si la clienta no cerró el navegador). Los dos llaman a las
 * mismas funciones de aquí, y estas son idempotentes: procesar dos veces el
 * mismo pago no acredita dos veces el abono.
 *
 * La pieza que lo garantiza es el compare-and-set de `registrarPagoAprobado`:
 * solo la llamada que logra mover el `Payment` a APROBADO acredita el abono.
 */

/**
 * Los códigos que se le dan a la clienta son cortos a propósito (se dictan por
 * teléfono), y por eso mismo son adivinables: cuatro caracteres son un millón
 * de combinaciones. Para que nadie pueda pasearse por las citas ajenas, la
 * pantalla pública de estado pide además este token, derivado del código con
 * la llave de sesión. No se guarda en ninguna parte: se recalcula.
 */
export function tokenPublico(referencia: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(referencia)
    .digest("hex")
    .slice(0, 16);
}

export function tokenValido(referencia: string, recibido: string | undefined) {
  if (!recibido) return false;
  const a = Buffer.from(tokenPublico(referencia), "utf8");
  const b = Buffer.from(recibido, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Token del enlace con el que la clienta cambia su cita sola (distinto al del abono). */
export const tokenCambioCita = (codigo: string) => tokenPublico(`cambiar:${codigo}`);

/** Token del enlace para dejar la reseña de una cita. */
export const tokenResena = (codigo: string) => tokenPublico(`resena:${codigo}`);

export type DatosCobro = {
  boldPaymentId?: string | null;
  boldTransactionId?: string | null;
  metodo?: string | null;
  correo?: string | null;
  payload?: string | null;
};

export type ResultadoPago =
  | { ok: true; yaProcesado: boolean }
  | { ok: false; motivo: "SIN_PAGO" };

export async function registrarPagoAprobado(
  referencia: string,
  datos: DatosCobro = {},
): Promise<ResultadoPago> {
  const pago = await prisma.payment.findUnique({ where: { reference: referencia } });
  if (!pago) return { ok: false, motivo: "SIN_PAGO" };

  const comunes = {
    status: "APROBADO",
    paidAt: pago.paidAt ?? new Date(),
    boldTransactionId: datos.boldTransactionId ?? pago.boldTransactionId,
    method: datos.metodo ?? pago.method,
    payerEmail: datos.correo ?? pago.payerEmail,
    rawPayload: datos.payload ?? pago.rawPayload,
  };

  // `updateMany` con la condición en el `where` es un compare-and-set atómico:
  // si otra llamada ya lo marcó, esta cuenta 0 y se retira sin tocar nada.
  let tomado: { count: number };
  try {
    tomado = await prisma.payment.updateMany({
      where: { id: pago.id, status: { not: "APROBADO" } },
      data: { ...comunes, boldPaymentId: datos.boldPaymentId ?? pago.boldPaymentId },
    });
  } catch (e) {
    // `boldPaymentId` es único: si llega uno que ya está en otra fila, se
    // guarda el resto igual antes que perder la aprobación.
    if ((e as { code?: string }).code !== "P2002") throw e;
    tomado = await prisma.payment.updateMany({
      where: { id: pago.id, status: { not: "APROBADO" } },
      data: comunes,
    });
  }

  if (tomado.count === 0) return { ok: true, yaProcesado: true };

  if (pago.appointmentId) await acreditarAbono(pago.appointmentId);
  return { ok: true, yaProcesado: false };
}

/**
 * Suma a la cita lo abonado y la deja confirmada: con plata de por medio, la
 * clienta ya se comprometió. Se recalcula desde los pagos aprobados en vez de
 * sumar, así un reintento o una anulación nunca descuadran el total.
 */
async function acreditarAbono(appointmentId: string) {
  await recalcularAbono(appointmentId);
  await prisma.appointment.updateMany({
    where: { id: appointmentId, status: "PENDIENTE" },
    data: { status: "CONFIRMADA" },
  });
  avisarAbonoRecibido(appointmentId);
}

async function recalcularAbono(appointmentId: string) {
  const suma = await prisma.payment.aggregate({
    where: { appointmentId, kind: "ABONO", status: "APROBADO" },
    _sum: { amount: true },
  });
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { depositPaid: suma._sum.amount ?? 0 },
  });
}

export async function registrarPagoRechazado(
  referencia: string,
  datos: DatosCobro = {},
): Promise<ResultadoPago> {
  const pago = await prisma.payment.findUnique({ where: { reference: referencia } });
  if (!pago) return { ok: false, motivo: "SIN_PAGO" };

  // Un rechazo que llega tarde no puede deshacer una aprobación: con PSE es
  // normal ver un intento fallido y otro exitoso sobre la misma referencia.
  const tomado = await prisma.payment.updateMany({
    where: { id: pago.id, status: { notIn: ["APROBADO", "ANULADO"] } },
    data: {
      status: "RECHAZADO",
      boldTransactionId: datos.boldTransactionId ?? pago.boldTransactionId,
      method: datos.metodo ?? pago.method,
      rawPayload: datos.payload ?? pago.rawPayload,
    },
  });
  if (tomado.count === 0) return { ok: true, yaProcesado: true };

  // Un abono rechazado no cambia la cita: la reserva sigue en pie, solo que
  // sin abono.
  return { ok: true, yaProcesado: false };
}

/**
 * Anulación (VOID): Bold revierte un cobro del mismo día. El abono de la cita
 * se recalcula desde los pagos que siguen aprobados.
 */
export async function registrarPagoAnulado(
  referencia: string,
  datos: DatosCobro = {},
): Promise<ResultadoPago> {
  const pago = await prisma.payment.findUnique({ where: { reference: referencia } });
  if (!pago) return { ok: false, motivo: "SIN_PAGO" };

  const tomado = await prisma.payment.updateMany({
    where: { id: pago.id, status: { not: "ANULADO" } },
    data: { status: "ANULADO", rawPayload: datos.payload ?? pago.rawPayload },
  });
  if (tomado.count === 0) return { ok: true, yaProcesado: true };

  if (pago.appointmentId) await recalcularAbono(pago.appointmentId);
  return { ok: true, yaProcesado: false };
}

/**
 * Le pregunta a Bold por una referencia y aplica lo que responda. Es la red de
 * seguridad cuando el webhook no llegó: la usa la pantalla de retorno del
 * abono. En desarrollo local, sin URL pública que Bold pueda llamar, es el
 * único camino que cierra un pago.
 */
export async function sincronizarPago(referencia: string) {
  const comprobante = await consultarTransaccion(referencia);
  if (!comprobante) return null;

  const datos: DatosCobro = {
    boldTransactionId: comprobante.transactionId,
    metodo: comprobante.metodo,
    correo: comprobante.correo,
  };

  if (comprobante.estado === "APPROVED") {
    await registrarPagoAprobado(referencia, datos);
  } else if (comprobante.estado === "REJECTED" || comprobante.estado === "FAILED") {
    await registrarPagoRechazado(referencia, datos);
  } else if (comprobante.estado === "VOIDED") {
    await registrarPagoAnulado(referencia, datos);
  }

  return comprobante.estado;
}
