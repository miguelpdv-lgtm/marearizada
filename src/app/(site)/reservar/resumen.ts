import "server-only";

import { fechaBogota, horaBogota } from "@/lib/agenda";
import { prisma } from "@/lib/db";
import { reglasAbono } from "@/lib/abono";
import { tokenCambioCita } from "@/lib/pagos";
import { pasarelaActiva } from "@/lib/pasarela";
import { getSettings } from "@/lib/site";

/** Lo que la clienta ve de su reserva: en el paso del pago y al confirmarse. */
export type ResumenCita = {
  codigo: string;
  /** POR_PAGAR | CONFIRMADA | PENDIENTE | CANCELADA | … */
  estado: string;
  servicio: string;
  profesional: string | null;
  /** "2026-11-10" y "09:30", en hora de Colombia. */
  fecha: string;
  hora: string;
  direccion: string;
  whatsapp: string | null;
  correo: string | null;
  precioLista: number;
  precioFinal: number;
  promocion: string | null;
  pagado: number;
  /** Enlace para mover la cita sola. */
  cambiar: string;
};

/** El cobro pendiente de una reserva POR_PAGAR. */
export type InfoPago = {
  abono: number;
  total: number;
  /** Hasta cuándo está apartado el cupo (ISO). */
  venceEn: string;
  /** Hay pasarela para cobrar; "PRUEBA" = modo de prueba. */
  pasarela: string | null;
};

export async function resumenCita(codigo: string) {
  const cita = await prisma.appointment.findUnique({
    where: { code: codigo },
    include: {
      branch: true,
      service: { select: { name: true, price: true } },
      staff: { select: { name: true } },
      promotion: { select: { name: true } },
    },
  });
  if (!cita) return null;

  const settings = await getSettings();
  const precioLista = cita.service.price;
  const precioFinal = cita.priceOverride ?? precioLista;

  const resumen: ResumenCita = {
    codigo: cita.code,
    estado: cita.status,
    servicio: cita.service.name,
    profesional: cita.staff?.name ?? null,
    fecha: fechaBogota(cita.startsAt),
    hora: horaBogota(cita.startsAt),
    direccion: cita.branch.address,
    whatsapp: cita.branch.whatsapp || settings.get("contact.whatsapp") || null,
    correo: cita.clientEmail,
    precioLista,
    precioFinal,
    promocion: cita.promotion?.name ?? null,
    pagado: cita.depositPaid,
    cambiar: `/reservar/cambiar?codigo=${cita.code}&t=${tokenCambioCita(cita.code)}`,
  };

  let pago: InfoPago | null = null;
  if (cita.status === "POR_PAGAR" && cita.holdUntil) {
    const reglas = await reglasAbono(precioFinal);
    pago = {
      abono: reglas.monto,
      total: reglas.total,
      venceEn: cita.holdUntil.toISOString(),
      pasarela: pasarelaActiva(),
    };
  }

  const vencida = cita.status === "POR_PAGAR" && !!cita.holdUntil && cita.holdUntil <= new Date();
  return { resumen, pago, vencida, holdUntil: cita.holdUntil, cita };
}
