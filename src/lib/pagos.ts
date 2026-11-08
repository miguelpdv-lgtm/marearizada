import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { hayConflicto } from "@/lib/agenda";
import { avisarAbonoRecibido, avisarCitaNueva, avisarPagoTardio } from "@/lib/correo/avisos";
import { consultarCobro } from "@/lib/pasarela";

/**
 * Qué pasa cuando la pasarela dice que un cobro se aprobó.
 *
 * Hay dos caminos que traen esa noticia y ninguno es confiable por sí solo:
 * el webhook (que puede llegar varias veces, o nunca) y la pantalla de retorno
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
  pasarela?: string | null;
  transaccionId?: string | null;
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
    gateway: datos.pasarela ?? pago.gateway,
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
      data: { ...comunes, gatewayId: datos.transaccionId ?? pago.gatewayId },
    });
  } catch (e) {
    // `gatewayId` es único: si llega uno que ya está en otra fila, se guarda
    // el resto igual antes que perder la aprobación.
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
 * Suma a la cita lo abonado y la confirma.
 *
 * - Reserva en línea esperando el abono (POR_PAGAR) → CONFIRMADA, y sale el
 *   correo de confirmación a la clienta y el aviso al salón.
 * - Reserva que se canceló sola porque el plazo venció, pero el pago llegó
 *   después: si el cupo sigue libre se revive; si ya lo tomó otra persona, la
 *   cita queda cancelada y el salón recibe un aviso para reagendar o devolver.
 * - Cita ya confirmada (un pago adicional): solo el aviso de abono recibido.
 *
 * Se recalcula desde los pagos aprobados en vez de sumar, así un reintento o
 * una anulación nunca descuadran el total.
 */
async function acreditarAbono(appointmentId: string) {
  await recalcularAbono(appointmentId);
  const cita = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true, holdUntil: true, staffId: true, branchId: true, startsAt: true, endsAt: true },
  });
  if (!cita) return;

  // Vencida: pasó el plazo del cupo apartado, la haya limpiado alguien o no.
  // En ese rato la disponibilidad ya no la contaba y otra persona pudo tomar
  // la hora, así que no se confirma sin revisar.
  const vencida =
    cita.holdUntil != null &&
    cita.holdUntil <= new Date() &&
    (cita.status === "POR_PAGAR" || cita.status === "CANCELADA");

  if (!vencida && (cita.status === "POR_PAGAR" || cita.status === "PENDIENTE")) {
    const r = await prisma.appointment.updateMany({
      where: { id: appointmentId, status: cita.status },
      data: { status: "CONFIRMADA", holdUntil: null },
    });
    if (r.count > 0 && cita.status === "POR_PAGAR") avisarCitaNueva(appointmentId);
    else if (r.count > 0) avisarAbonoRecibido(appointmentId);
    return;
  }

  if (vencida) {
    const ocupado = await hayConflicto(cita.branchId, cita.staffId, cita.startsAt, cita.endsAt, appointmentId);
    if (!ocupado) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CONFIRMADA", holdUntil: null, cancelledAt: null, internalNotes: null },
      });
      avisarCitaNueva(appointmentId);
    } else {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELADA",
          cancelledAt: new Date(),
          internalNotes:
            "Pagó el abono después de que venció el plazo y el cupo ya estaba tomado. Contáctala para reagendar o devolver el abono.",
        },
      });
      avisarPagoTardio(appointmentId);
    }
    return;
  }

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
      gateway: datos.pasarela ?? pago.gateway,
      method: datos.metodo ?? pago.method,
      rawPayload: datos.payload ?? pago.rawPayload,
    },
  });
  if (tomado.count === 0) return { ok: true, yaProcesado: true };

  // Un pago rechazado no cambia la cita: sigue apartada hasta que venza el
  // plazo, y la clienta puede intentar otra vez.
  return { ok: true, yaProcesado: false };
}

/** Anulación: la pasarela revierte un cobro. Se recalcula lo abonado. */
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
 * Le pregunta a la pasarela por una referencia y aplica lo que responda. Es la
 * red de seguridad cuando el webhook no llegó: la usa la pantalla de retorno.
 */
export async function sincronizarPago(referencia: string) {
  const cobro = await consultarCobro(referencia);
  if (!cobro) return null;

  const datos: DatosCobro = { transaccionId: cobro.transaccionId, metodo: cobro.metodo, correo: cobro.correo };
  if (cobro.estado === "APROBADO") await registrarPagoAprobado(referencia, datos);
  else if (cobro.estado === "RECHAZADO") await registrarPagoRechazado(referencia, datos);
  else if (cobro.estado === "ANULADO") await registrarPagoAnulado(referencia, datos);
  return cobro.estado;
}
