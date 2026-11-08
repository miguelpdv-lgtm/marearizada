import "server-only";

import { prisma } from "@/lib/db";
import { tokenCambioCita, tokenValido } from "@/lib/pagos";

export const tokenCambio = tokenCambioCita;

/** "mr 7k3p", "7K3P" o "MR-7K3P" → "MR-7K3P". null si no parece un código. */
export function normalizarCodigo(texto: string) {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Con prefijo son 6 caracteres; sin él, 4 (y el código mismo puede empezar por MR).
  const sufijo = limpio.length === 6 && limpio.startsWith("MR") ? limpio.slice(2) : limpio;
  return /^[A-Z0-9]{4}$/.test(sufijo) ? `MR-${sufijo}` : null;
}

/** La cita del enlace, si el token es válido. */
export async function cargarCita(codigo: string, token: string | undefined) {
  if (!codigo || !tokenValido(`cambiar:${codigo}`, token)) return null;
  const cita = await prisma.appointment.findUnique({
    where: { code: codigo },
    include: {
      branch: true,
      service: { select: { name: true, bookable: true } },
      staff: { select: { name: true } },
      sale: { select: { id: true } },
    },
  });
  if (!cita) return null;
  return {
    ...cita,
    duracionMin: Math.round((cita.endsAt.getTime() - cita.startsAt.getTime()) / 60_000),
  };
}

/** Por qué la clienta no puede mover esta cita sola, o null si sí puede. */
export function motivoNoCambiable(
  cita: { status: string; startsAt: Date; sale: { id: string } | null; service: { bookable: boolean } },
  minHorasAntes: number,
) {
  // Los servicios con abono (color) los agenda y los mueve solo el salón.
  if (!cita.service.bookable) {
    return "Este servicio requiere abono, así que el cambio lo hacemos contigo. Escríbenos por WhatsApp y buscamos otra fecha.";
  }
  if (cita.status === "CANCELADA") return "Esta cita está cancelada. Reserva una nueva desde la página de reservas.";
  if (cita.status === "ATENDIDA" || cita.status === "NO_ASISTIO" || cita.sale) {
    return "Esta cita ya pasó. Si quieres volver, reserva una nueva.";
  }
  if (cita.startsAt.getTime() < Date.now() + minHorasAntes * 3600_000) {
    return `Falta muy poco para tu cita: los cambios se hacen con al menos ${minHorasAntes} horas de antelación. Escríbenos por WhatsApp y te ayudamos.`;
  }
  return null;
}
