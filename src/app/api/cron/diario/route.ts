import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { aUtc, hoyBogota, liberarVencidas, sumarDias } from "@/lib/agenda";
import { enviarInvitacionResena, enviarRecordatorio } from "@/lib/correo/programados";
import { getSettings } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Correos por corrida, para no pasar el límite de tiempo ni el de Resend. */
const LOTE = 80;

/**
 * Trabajo diario: recordatorio a las citas de mañana e invitación a reseñar a
 * las de los últimos días que quedaron como atendidas.
 *
 * Lo llama un programador externo (el cron de Vercel, cron-job.org o GitHub
 * Actions) con `Authorization: Bearer <CRON_SECRET>`, una vez al día. Se
 * puede llamar más seguido sin riesgo: cada cita guarda cuándo se le mandó
 * cada correo y no se repite.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET ?? "";
  if (!secreto) {
    return NextResponse.json({ error: "Falta CRON_SECRET" }, { status: 503 });
  }
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const settings = await getSettings();
  const ahora = new Date();
  const resultado = { recordatorios: 0, resenas: 0, fallidos: 0, liberadas: await liberarVencidas() };

  // --- Recordatorios: de ahora hasta el final de mañana (hora de Colombia).
  // Las reservadas hace menos de 12 horas no lo reciben: acaban de recibir la
  // confirmación.
  if (settings.bool("email.recordatorios", true)) {
    const finDeManana = aUtc(sumarDias(hoyBogota(), 2), "00:00");
    const citas = await prisma.appointment.findMany({
      where: {
        status: { in: ["PENDIENTE", "CONFIRMADA"] },
        reminderSentAt: null,
        clientEmail: { not: null },
        startsAt: { gt: ahora, lt: finDeManana },
        createdAt: { lt: new Date(ahora.getTime() - 12 * 3600_000) },
      },
      include: { service: true, branch: true },
      orderBy: { startsAt: "asc" },
      take: LOTE,
    });
    for (const cita of citas) {
      if (await enviarRecordatorio(cita, settings)) {
        await prisma.appointment.update({ where: { id: cita.id }, data: { reminderSentAt: new Date() } });
        resultado.recordatorios++;
      } else resultado.fallidos++;
    }
  }

  // --- Reseñas: citas atendidas en los últimos 3 días, sin reseña todavía.
  if (settings.bool("email.resenas", true)) {
    const citas = await prisma.appointment.findMany({
      where: {
        status: "ATENDIDA",
        reviewRequestedAt: null,
        review: null,
        clientEmail: { not: null },
        startsAt: { gt: new Date(ahora.getTime() - 3 * 86400_000), lt: ahora },
      },
      include: { service: true, branch: true },
      orderBy: { startsAt: "asc" },
      take: LOTE,
    });
    for (const cita of citas) {
      if (await enviarInvitacionResena(cita, settings)) {
        await prisma.appointment.update({ where: { id: cita.id }, data: { reviewRequestedAt: new Date() } });
        resultado.resenas++;
      } else resultado.fallidos++;
    }
  }

  console.log("[cron diario]", JSON.stringify(resultado));
  return NextResponse.json(resultado);
}
