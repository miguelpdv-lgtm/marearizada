import "server-only";

import type { Appointment, Branch, Service } from "@prisma/client";

import { getSettings, urlSitio } from "@/lib/site";
import { tokenResena } from "@/lib/pagos";

import { cuando, enlaceCambiar, pieDe } from "./avisos";
import { correoDelSalon, enviar } from "./enviar";
import { boton, escapar, fila, parrafo, plantilla, tablaDatos } from "./plantilla";

/**
 * Correos que no responden a una acción sino al calendario: el recordatorio
 * del día anterior y la invitación a dejar una reseña después de la visita.
 * Los manda el trabajo diario (/api/cron/diario). Devuelven true si el correo
 * salió, para que el trabajo marque la cita y no lo repita.
 */

type Cita = Appointment & { service: Service | null; branch: Branch | null };
type Ajustes = Awaited<ReturnType<typeof getSettings>>;

const primerNombre = (nombre: string) => escapar(nombre.trim().split(/\s+/)[0] ?? nombre);

export const enlaceResena = (codigo: string) =>
  `${urlSitio()}/resena?c=${encodeURIComponent(codigo)}&t=${tokenResena(codigo)}`;

export async function enviarRecordatorio(cita: Cita, settings: Ajustes) {
  if (!cita.clientEmail) return false;
  const sede = cita.branch;
  const whatsapp = sede?.whatsapp || settings.get("contact.whatsapp");

  return enviar({
    para: cita.clientEmail,
    asunto: `Te esperamos: ${cuando(cita.startsAt)}`,
    responderA: correoDelSalon(settings.get("contact.email")) || null,
    html: plantilla({
      titulo: "Tu cita se acerca",
      etiqueta: "Recordatorio",
      despedida: true,
      pie: pieDe(settings, "Te llega porque tienes una cita en Marea Rizada."),
      preencabezado: `${cita.service?.name ?? "Tu cita"} · ${cuando(cita.startsAt)}`,
      cuerpo: [
        parrafo(`Hola ${primerNombre(cita.clientName)}, te recordamos tu cita:`),
        tablaDatos(
          [
            fila("Servicio", escapar(cita.service?.name ?? "—")),
            fila("Cuándo", escapar(cuando(cita.startsAt))),
            fila("Dónde", escapar(`${sede?.name ?? ""} · ${sede?.address ?? ""}`)),
            fila("Tu código", `<span style="font-family:monospace;letter-spacing:.05em;">${escapar(cita.code)}</span>`),
          ].join(""),
        ),
        parrafo(
          "Si puedes, llega con el pelo como lo llevas normalmente: así vemos cómo se comporta tu rizo en el día a día.",
        ),
        parrafo("¿No alcanzas a venir? Muévela tú misma con este botón, mientras haya cupo:"),
        boton("Cambiar mi cita", enlaceCambiar(cita.code)),
        whatsapp ? parrafo(`O escríbenos por WhatsApp al ${escapar(whatsapp)}.`) : "",
      ].join(""),
    }),
  });
}

export async function enviarInvitacionResena(cita: Cita, settings: Ajustes) {
  if (!cita.clientEmail) return false;

  return enviar({
    para: cita.clientEmail,
    asunto: "¿Cómo te fue en Marea Rizada?",
    responderA: correoDelSalon(settings.get("contact.email")) || null,
    html: plantilla({
      titulo: "Gracias por venir",
      etiqueta: "Tu visita",
      despedida: true,
      pie: pieDe(settings, "Te llega porque tuviste una cita en Marea Rizada."),
      preencabezado: "Cuéntanos cómo quedó tu rizo. Son dos minutos.",
      cuerpo: [
        parrafo(
          `Hola ${primerNombre(cita.clientName)}, gracias por venir a tu cita de ${escapar(
            cita.service?.name?.toLowerCase() ?? "rizos",
          )}. Nos encantaría saber cómo te fue y cómo va tu rizo.`,
        ),
        parrafo("Tu reseña ayuda a otras personas con rizos a encontrarnos, y a nosotras a mejorar."),
        boton("Dejar mi reseña", enlaceResena(cita.code)),
      ].join(""),
    }),
  });
}
