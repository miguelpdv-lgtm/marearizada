import "server-only";

import { prisma } from "@/lib/db";
import { aUtc, hoyBogota, sumarDias } from "@/lib/agenda";
import { getSettings } from "@/lib/site";

import { enviarRecordatorio } from "./programados";

/** Día (hora de Bogotá) en que esta instancia ya revisó: evita consultar en cada página del panel. */
let revisado: string | null = null;
let enCurso = false;

/** Tope por corrida, para no pasar el límite de tiempo ni el del proveedor de correo. */
const LOTE = 60;

/**
 * Recordatorio "tu cita es hoy" con botón para reagendar. Lo dispara la primera
 * entrada al panel de cada día (ver el layout del panel), sin bloquear la
 * página. Cada cita guarda `dayReminderSentAt`: aunque dos personas entren a la
 * vez, o el servidor se reinicie, el correo no se repite. Si un envío falla, la
 * cita queda sin marcar y se reintenta en la próxima entrada.
 *
 * Respeta el ajuste "Recordatorio por correo" y no escribe a quien reservó
 * hace menos de 2 horas (acaba de recibir la confirmación).
 */
export async function enviarRecordatoriosDelDia() {
  const hoy = hoyBogota();
  if (revisado === hoy || enCurso) return;
  enCurso = true;
  try {
    const settings = await getSettings();
    if (!settings.bool("email.recordatorios", true)) {
      revisado = hoy;
      return;
    }
    const ahora = new Date();
    const citas = await prisma.appointment.findMany({
      where: {
        status: { in: ["PENDIENTE", "CONFIRMADA"] },
        dayReminderSentAt: null,
        clientEmail: { not: null },
        startsAt: { gt: ahora, lt: aUtc(sumarDias(hoy, 1), "00:00") },
        createdAt: { lt: new Date(ahora.getTime() - 2 * 3600_000) },
      },
      include: { service: true, branch: true },
      orderBy: { startsAt: "asc" },
      take: LOTE,
    });

    let fallidos = 0;
    for (const cita of citas) {
      // Se reclama antes de enviar: si otra entrada ya la tomó, no se repite.
      const { count } = await prisma.appointment.updateMany({
        where: { id: cita.id, dayReminderSentAt: null },
        data: { dayReminderSentAt: new Date() },
      });
      if (count === 0) continue;
      const salio = await enviarRecordatorio(cita, settings, true).catch(() => false);
      if (!salio) {
        fallidos++;
        await prisma.appointment.update({ where: { id: cita.id }, data: { dayReminderSentAt: null } });
      }
    }
    // Con fallos o con más citas que el tope, la próxima entrada vuelve a intentarlo.
    if (fallidos === 0 && citas.length < LOTE) revisado = hoy;
  } catch (error) {
    console.error("Recordatorios del día:", error);
  } finally {
    enCurso = false;
  }
}
