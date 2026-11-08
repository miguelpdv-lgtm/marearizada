"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { tokenValido } from "@/lib/pagos";
import { consumir, esperaLegible, ipDeLaPeticion } from "@/lib/rateLimit";

const esquema = z.object({
  codigo: z.string().trim().min(4).max(12),
  token: z.string().min(10).max(200),
  nombre: z.string().trim().min(2, "Escribe cómo quieres que aparezca tu nombre.").max(40),
  rating: z.number().int().min(1, "Elige de 1 a 5 estrellas.").max(5),
  texto: z.string().trim().min(10, "Cuéntanos un poco más (al menos 10 caracteres).").max(800),
  autoriza: z.boolean().refine((v) => v, "Necesitamos tu autorización para publicarla."),
});

export type ResultadoResena = { ok: true } | { ok: false; error: string; campo?: string };

/**
 * Guarda la reseña de una cita. Entra apagada (`active: false`) y la publica el
 * equipo desde Contenido → Historias. Una por cita.
 */
export async function enviarResena(datos: z.input<typeof esquema>): Promise<ResultadoResena> {
  const p = esquema.safeParse(datos);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: i.message, campo: i.path.join(".") };
  }
  const d = p.data;
  if (!tokenValido(`resena:${d.codigo}`, d.token)) return { ok: false, error: "Este enlace no es válido." };

  const permiso = await consumir("resena", await ipDeLaPeticion());
  if (!permiso.ok) return { ok: false, error: `Espera ${esperaLegible(permiso.segundos)} e inténtalo de nuevo.` };

  const cita = await prisma.appointment.findUnique({
    where: { code: d.codigo },
    select: { id: true, status: true, service: { select: { name: true } }, review: { select: { id: true } } },
  });
  if (!cita) return { ok: false, error: "No encontramos esa cita." };
  if (cita.review) return { ok: true };
  if (cita.status !== "ATENDIDA") return { ok: false, error: "Podrás dejar tu reseña después de tu cita." };

  try {
    await prisma.testimonial.create({
      data: {
        appointmentId: cita.id,
        source: "CLIENTA",
        active: false,
        clientName: d.nombre,
        quote: d.texto,
        rating: d.rating,
        serviceName: cita.service?.name ?? null,
      },
    });
  } catch (e) {
    // Doble envío: la reseña ya quedó guardada.
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  revalidatePath("/admin/historias");
  return { ok: true };
}
