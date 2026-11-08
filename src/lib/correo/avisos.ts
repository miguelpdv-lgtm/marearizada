import "server-only";

import { after } from "next/server";

import { prisma } from "@/lib/db";
import { fechaBogota, horaBogota } from "@/lib/agenda";
import { formatCOP, whatsappLink } from "@/lib/format";
import { getSettings, urlSitio } from "@/lib/site";
import { tokenCambioCita } from "@/lib/pagos";

import { correoDelSalon, enviar } from "./enviar";
import {
  boton,
  escapar,
  fila,
  parrafo,
  plantilla,
  tablaDatos,
  type Pie,
} from "./plantilla";

/**
 * Los correos que manda el sitio: a la clienta (cita lista, confirmada,
 * cancelada o reagendada; abono recibido; gracias por la visita) y al salón
 * (cita nueva, cambios de cita).
 *
 * Diseño sencillo a propósito: encabezado vino, texto y datos. Con la versión
 * de marca (bloques de color, ilustraciones, logo en imagen) Gmail empezó a
 * mandarlos a Promociones; con esta llegaban a Principal.
 *
 * Todo sale por `after()`, nunca bloqueando. Una cita ya está guardada cuando
 * se dispara el correo, así que esperar a Resend solo serviría para que la
 * pantalla de "tu cita quedó lista" tarde más — y para que una caída de Resend
 * se vea como una reserva fallida, que es justo lo contrario de lo que pasó.
 *
 * Las horas se arman con `fechaBogota`/`horaBogota` y no con `Intl`: las citas
 * se guardan en UTC y el servidor de Vercel corre en UTC, así que formatear
 * con la zona del proceso sacaría la cita cinco horas corrida.
 */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "jueves 24 de septiembre · 10:30 a.m." en hora de Colombia. */
export function cuando(fecha: Date) {
  const iso = fechaBogota(fecha);
  const [a, m, d] = iso.split("-").map(Number);
  // Se construye en UTC a propósito: `iso` ya viene convertido a Bogotá, y lo
  // único que se quiere de este Date es el día de la semana.
  const diaSemana = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];

  const [hh, mm] = horaBogota(fecha).split(":").map(Number);
  const sufijo = hh < 12 ? "a.m." : "p.m.";
  const hora12 = hh % 12 === 0 ? 12 : hh % 12;

  return `${diaSemana} ${d} de ${MESES[m - 1]} · ${hora12}:${String(mm).padStart(2, "0")} ${sufijo}`;
}

/** El pie de cada correo: contacto de la marca y por qué le llega. */
function pieDe(settings: Awaited<ReturnType<typeof getSettings>>, motivo: string): Pie {
  return {
    whatsapp: whatsappLink(settings.get("contact.whatsapp"), "¡Hola Marea Rizada!"),
    instagram: settings.get("social.instagram") || null,
    sitio: urlSitio(),
    motivo,
  };
}

/**
 * A dónde van los avisos internos (cita nueva, pedido pagado, pedido para
 * revisar), o null si están apagados. Se encienden en Configuración →
 * Contacto → "Enviar avisos administrativos por correo": apagados mientras el
 * salón hace pruebas, para no llenar el buzón con citas y pedidos de mentira.
 * Van todos al correo de contacto; el de cada sede ya no se usa acá.
 */
function avisosAlSalon(settings: Awaited<ReturnType<typeof getSettings>>) {
  if (!settings.bool("email.avisosSalon")) return null;
  return correoDelSalon(settings.get("contact.email")) || null;
}

/** Enlace para que la clienta mueva su cita sola, sin escribir el código. */
const enlaceCambiar = (codigo: string) =>
  `${urlSitio()}/reservar/cambiar?codigo=${encodeURIComponent(codigo)}&t=${tokenCambioCita(codigo)}`;

const POR_CITA = "Te llega porque tienes una cita en Marea Rizada.";
const INTERNO = "Aviso interno de la agenda de Marea Rizada.";

/* --- Citas ----------------------------------------------------------------- */

/**
 * Confirma la cita a la clienta y se la avisa al salón.
 *
 * Se le pasa el id y no la cita entera para releerla con sus relaciones: el
 * correo necesita el nombre del servicio, la sede y quién atiende, y quien
 * llama no tiene por qué cargar con eso.
 */
export function avisarCitaNueva(appointmentId: string) {
  after(async () => {
    try {
      const cita = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true, branch: true },
      });
      if (!cita) return;

      const settings = await getSettings();
      const sede = cita.branch;
      const whatsapp = sede?.whatsapp || settings.get("contact.whatsapp");

      const resumen = tablaDatos(
        [
          fila("Servicio", escapar(cita.service?.name ?? "—")),
          fila("Cuándo", escapar(cuando(cita.startsAt))),
          fila("Dónde", escapar(`${sede?.name ?? ""} · ${sede?.address ?? ""}`)),
          fila("Tu código", `<span style="font-family:monospace;letter-spacing:.05em;">${escapar(cita.code)}</span>`),
        ].join(""),
      );

      // --- A la clienta ---
      if (cita.clientEmail) {
        await enviar({
          para: cita.clientEmail,
          asunto: `Tu cita en Marea Rizada quedó lista · ${cita.code}`,
          responderA: correoDelSalon(settings.get("contact.email")) || null,
          html: plantilla({
            titulo: "Tu cita quedó lista",
            etiqueta: "Tu cita",
            despedida: true,
            pie: pieDe(settings, POR_CITA),
            preencabezado: `${cita.service?.name ?? "Tu cita"} · ${cuando(cita.startsAt)}`,
            cuerpo: [
              parrafo(`Hola ${escapar(cita.clientName.split(" ")[0] ?? cita.clientName)}, te esperamos.`),
              resumen,
              parrafo(
                "Guarda tu código: si algo se te cruza, con él y tu celular puedes cambiar la fecha tú misma desde la página de reservas, o directo con este botón.",
              ),
              boton("Cambiar mi cita", enlaceCambiar(cita.code)),
              parrafo(
                `¿Prefieres que te ayudemos? Escríbenos${whatsapp ? ` por WhatsApp al ${escapar(whatsapp)}` : ""} y la movemos sin problema.`,
              ),
            ].join(""),
          }),
        });
      }

      // --- Al salón ---
      const buzon = avisosAlSalon(settings);
      if (buzon) {
        await enviar({
          para: buzon,
          asunto: `Cita nueva · ${cuando(cita.startsAt)} · ${cita.clientName}`,
          responderA: cita.clientEmail,
          html: plantilla({
            titulo: "Entró una cita nueva",
            etiqueta: "Agenda",
            pie: pieDe(settings, INTERNO),
            preencabezado: `${cita.clientName} · ${cita.service?.name ?? ""}`,
            cuerpo: [
              tablaDatos(
                [
                  fila("Clienta", escapar(cita.clientName)),
                  fila("Celular", escapar(cita.clientPhone)),
                  cita.clientEmail ? fila("Correo", escapar(cita.clientEmail)) : "",
                  fila("Servicio", escapar(cita.service?.name ?? "—")),
                  fila("Cuándo", escapar(cuando(cita.startsAt))),
                  fila("Sede", escapar(sede?.name ?? "—")),
                  cita.firstVisit ? fila("Primera visita", "Sí") : "",
                  cita.notes ? fila("Nota", escapar(cita.notes)) : "",
                ].join(""),
              ),
              boton("Abrir la agenda", `${urlSitio()}/admin/agenda`),
            ].join(""),
          }),
        });
      }
    } catch (e) {
      const error = e as Error;
      console.error(`[correo] falló el aviso de la cita ${appointmentId}:`, error?.message ?? e);
    }
  });
}


/**
 * Le manda el comprobante de su compra a quien tenga correo registrado.
 *
 * No reemplaza a la factura electrónica —esa la manda Siigo, con su CUFE—:
 * esto es el "aquí está lo que te llevaste" que se lee en el celular saliendo
 * del salón. Por eso lleva el detalle y no habla de impuestos.
 *
 * El correo no se pide en caja para no alargar el cobro: se busca en la ficha
 * de la clienta, que es donde ya está si alguna vez lo dio. Si no hay, no se
 * manda nada y la venta sigue igual de válida.
 */
export function avisarVentaMostrador(saleId: string) {
  after(async () => {
    try {
      const venta = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          items: true,
          branch: true,
          client: { select: { email: true } },
        },
      });
      if (!venta?.client?.email) return;

      const settings = await getSettings();

      const lineas = venta.items
        .map((i) => {
          const bruto = i.unitPrice * i.quantity;
          const neto = bruto - i.discount;
          const valor =
            i.discount > 0
              ? `${formatCOP(neto)} <span style="font-weight:400;color:#7f384f;text-decoration:line-through;">${formatCOP(bruto)}</span>`
              : formatCOP(bruto);
          return fila(`${i.quantity} ×`, `${escapar(i.name)} — ${valor}`);
        })
        .join("");

      const total = venta.items.reduce(
        (a, i) => a + i.unitPrice * i.quantity - i.discount,
        0,
      );

      await enviar({
        para: venta.client.email,
        asunto: `Gracias por tu visita · ${venta.code}`,
        responderA: correoDelSalon(settings.get("contact.email")) || null,
        html: plantilla({
          titulo: "Gracias por tu visita",
          etiqueta: "Tu visita",
          despedida: true,
          pie: pieDe(settings, "Te llega porque compraste en uno de nuestros salones."),
          preencabezado: `${venta.code} · ${formatCOP(total)}`,
          cuerpo: [
            parrafo(
              venta.clientName
                ? `Hola ${escapar(venta.clientName.split(" ")[0])}, esto es lo que te llevaste hoy.`
                : "Esto es lo que te llevaste hoy.",
            ),
            tablaDatos(lineas + fila("Total", formatCOP(total))),
            tablaDatos(
              [
                fila("Dónde", escapar(venta.branch?.name ?? "—")),
                fila("Comprobante", escapar(venta.code)),
              ].join(""),
            ),
            parrafo(
              "Si tienes dudas sobre cómo usar algo de lo que compraste, escríbenos. Para eso estamos.",
            ),
            // Reseña en Google: es lo que más pesa para aparecer en Maps.
            ...(venta.branch?.googleReviewUrl
              ? [
                  parrafo(
                    "¿Te gustó tu visita? Cuéntalo en Google: tu reseña ayuda a otras rizadas a encontrarnos.",
                  ),
                  boton("Dejar mi reseña", venta.branch.googleReviewUrl),
                ]
              : []),
          ].join(""),
        }),
      });
    } catch (e) {
      const error = e as Error;
      console.error(
        `[correo] falló el comprobante de la venta ${saleId}:`,
        error?.message ?? e,
      );
    }
  });
}

/* --- Cambios en una cita --------------------------------------------------- */

/**
 * Le avisa a la clienta cuando su cita se confirma o se cancela.
 *
 * Solo esos dos estados salen por correo. "Asiste" y "no asistió" son registros
 * internos: escribirle a alguien para decirle que vino al salón no aporta nada,
 * y decirle que no vino sobra.
 */
export function avisarCambioDeCita(appointmentId: string, estado: string) {
  if (estado !== "CONFIRMADA" && estado !== "CANCELADA") return;

  after(async () => {
    try {
      const cita = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true, branch: true },
      });
      if (!cita?.clientEmail) return;

      const settings = await getSettings();
      const sede = cita.branch;
      const whatsapp = sede?.whatsapp || settings.get("contact.whatsapp");
      const nombre = escapar(cita.clientName.split(" ")[0] ?? cita.clientName);

      const resumen = tablaDatos(
        [
          fila("Servicio", escapar(cita.service?.name ?? "—")),
          fila("Cuándo", escapar(cuando(cita.startsAt))),
          fila("Dónde", escapar(`${sede?.name ?? ""} · ${sede?.address ?? ""}`)),
          fila(
            "Tu código",
            `<span style="font-family:monospace;letter-spacing:.05em;">${escapar(cita.code)}</span>`,
          ),
        ].join(""),
      );

      const confirmada = estado === "CONFIRMADA";

      await enviar({
        para: cita.clientEmail,
        asunto: confirmada
          ? `Tu cita quedó confirmada · ${cita.code}`
          : `Cancelamos tu cita · ${cita.code}`,
        responderA: correoDelSalon(settings.get("contact.email")) || null,
        html: plantilla({
          titulo: confirmada ? "Tu cita está confirmada" : "Tu cita quedó cancelada",
          etiqueta: "Tu cita",
          despedida: true,
          pie: pieDe(settings, POR_CITA),
          preencabezado: `${cita.service?.name ?? "Tu cita"} · ${cuando(cita.startsAt)}`,
          cuerpo: confirmada
            ? [
                parrafo(`Hola ${nombre}, te confirmamos la cita. Te esperamos.`),
                resumen,
                parrafo(
                  `Si algo se te cruza, avísanos con tiempo${whatsapp ? ` por WhatsApp al ${escapar(whatsapp)}` : ""} y la movemos.`,
                ),
              ].join("")
            : [
                parrafo(`Hola ${nombre}, cancelamos esta cita:`),
                resumen,
                parrafo(
                  `Si fue un malentendido o quieres reagendar, escríbenos${whatsapp ? ` al ${escapar(whatsapp)}` : ""} y te buscamos otro espacio.`,
                ),
              ].join(""),
        }),
      });
    } catch (e) {
      const error = e as Error;
      console.error(
        `[correo] falló el aviso de cambio de la cita ${appointmentId}:`,
        error?.message ?? e,
      );
    }
  });
}

/* --- Reagendar y abono ----------------------------------------------------- */

/** Resumen de la cita que comparten los avisos a la clienta. */
async function leerCita(appointmentId: string) {
  const cita = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, branch: true },
  });
  if (!cita?.clientEmail) return null;

  const settings = await getSettings();
  const sede = cita.branch;
  const whatsapp = sede?.whatsapp || settings.get("contact.whatsapp");
  const nombre = escapar(cita.clientName.split(" ")[0] ?? cita.clientName);
  const resumen = tablaDatos(
    [
      fila("Servicio", escapar(cita.service?.name ?? "—")),
      fila("Cuándo", escapar(cuando(cita.startsAt))),
      fila("Dónde", escapar(`${sede?.name ?? ""} · ${sede?.address ?? ""}`)),
      fila(
        "Tu código",
        `<span style="font-family:monospace;letter-spacing:.05em;">${escapar(cita.code)}</span>`,
      ),
    ].join(""),
  );
  return { cita, settings, whatsapp, nombre, resumen, email: cita.clientEmail };
}

/** Le avisa a la clienta que su cita cambió de fecha u hora. */
export function avisarCitaReagendada(appointmentId: string) {
  after(async () => {
    try {
      const l = await leerCita(appointmentId);
      if (!l) return;
      const { cita, settings, whatsapp, nombre, resumen } = l;

      await enviar({
        para: l.email,
        asunto: `Movimos tu cita · ${cita.code}`,
        responderA: correoDelSalon(settings.get("contact.email")) || null,
        html: plantilla({
          titulo: "Tu cita cambió de fecha",
          etiqueta: "Tu cita",
          despedida: true,
          pie: pieDe(settings, POR_CITA),
          preencabezado: `${cita.service?.name ?? "Tu cita"} · ${cuando(cita.startsAt)}`,
          cuerpo: [
            parrafo(`Hola ${nombre}, tu cita quedó en esta nueva fecha:`),
            resumen,
            parrafo("Si esta fecha tampoco te sirve, puedes cambiarla otra vez:"),
            boton("Cambiar mi cita", enlaceCambiar(cita.code)),
            parrafo(
              `O escríbenos${whatsapp ? ` por WhatsApp al ${escapar(whatsapp)}` : ""} y buscamos otra.`,
            ),
          ].join(""),
        }),
      });
    } catch (e) {
      const error = e as Error;
      console.error(
        `[correo] falló el aviso de reagendamiento de la cita ${appointmentId}:`,
        error?.message ?? e,
      );
    }
  });
}

/** Le confirma a la clienta que su abono (o el pago total) entró. */
export function avisarAbonoRecibido(appointmentId: string) {
  after(async () => {
    try {
      const l = await leerCita(appointmentId);
      if (!l) return;
      const { cita, settings, nombre, resumen } = l;

      const pagoTotal = cita.depositPaid >= (cita.priceOverride ?? cita.service?.price ?? 0);
      const monto = formatCOP(cita.depositPaid);

      await enviar({
        para: l.email,
        asunto: pagoTotal
          ? `Tu cita quedó paga · ${cita.code}`
          : `Recibimos tu abono · ${cita.code}`,
        responderA: correoDelSalon(settings.get("contact.email")) || null,
        html: plantilla({
          titulo: pagoTotal ? "Tu cita quedó paga" : "Recibimos tu abono",
          etiqueta: "Tu cita",
          despedida: true,
          pie: pieDe(settings, POR_CITA),
          preencabezado: `${monto} · ${cita.service?.name ?? "Tu cita"}`,
          cuerpo: [
            parrafo(
              pagoTotal
                ? `Hola ${nombre}, recibimos tu pago de <strong>${monto}</strong>. El día de la cita no tienes que pagar nada más.`
                : `Hola ${nombre}, recibimos tu abono de <strong>${monto}</strong>. Se descuenta del valor de tu servicio el día de la cita.`,
            ),
            resumen,
          ].join(""),
        }),
      });
    } catch (e) {
      const error = e as Error;
      console.error(`[correo] falló el aviso de abono de la cita ${appointmentId}:`, error?.message ?? e);
    }
  });
}

/** Le avisa al salón que una clienta movió su cita desde la web. */
export function avisarCambioAlSalon(appointmentId: string, antes: Date) {
  after(async () => {
    try {
      const settings = await getSettings();
      const buzon = avisosAlSalon(settings);
      if (!buzon) return;
      const cita = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true, branch: true, staff: { select: { name: true } } },
      });
      if (!cita) return;

      await enviar({
        para: buzon,
        asunto: `Cita movida por la clienta · ${cita.clientName} · ${cuando(cita.startsAt)}`,
        responderA: cita.clientEmail,
        html: plantilla({
          titulo: "Una clienta movió su cita",
          etiqueta: "Agenda",
          pie: pieDe(settings, INTERNO),
          preencabezado: `${cita.code} · ahora ${cuando(cita.startsAt)}`,
          cuerpo: [
            tablaDatos(
              [
                fila("Clienta", escapar(cita.clientName)),
                fila("Celular", escapar(cita.clientPhone)),
                fila("Código", escapar(cita.code)),
                fila("Servicio", escapar(cita.service?.name ?? "—")),
                fila("Antes", escapar(cuando(antes))),
                fila("Ahora", `<strong>${escapar(cuando(cita.startsAt))}</strong>`),
                fila("Profesional", escapar(cita.staff?.name ?? "Sin asignar")),
                fila("Sede", escapar(cita.branch?.name ?? "—")),
              ].join(""),
            ),
            boton("Abrir la agenda", `${urlSitio()}/admin/agenda`),
          ].join(""),
        }),
      });
    } catch (e) {
      const error = e as Error;
      console.error(`[correo] falló el aviso al salón del cambio de ${appointmentId}:`, error?.message ?? e);
    }
  });
}
