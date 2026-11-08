import "server-only";

import { Resend } from "resend";

/**
 * Envío de correo transaccional con Resend.
 *
 * Dos reglas que gobiernan todo lo de esta carpeta:
 *
 *   1. **Un correo que falla no tumba lo que lo disparó.** Una cita se guardó
 *      y una venta se cobró aunque el correo no salga; convertir un problema
 *      de Resend en un error de reserva sería cambiar un mal rato por una
 *      venta perdida. Por eso `enviar()` nunca lanza: deja el motivo en el log
 *      y devuelve `false`.
 *   2. **Sin `RESEND_API_KEY` el sitio funciona igual**, como pasa con Bold y
 *      con Siigo. En local no hace falta configurar nada para probar el resto.
 */

const DESDE_POR_DEFECTO = "Amicrespa <hola@amicrespa.com>";

export function correoConfigurado() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * De qué dirección salen los correos. Tiene que ser de un dominio verificado
 * en Resend por DNS; si no, Resend rechaza el envío.
 */
function remitente() {
  return process.env.RESEND_FROM || DESDE_POR_DEFECTO;
}

/**
 * A dónde llegan los avisos internos (cita nueva, pedido nuevo). Si no se
 * configura, se usa el correo de contacto del sitio.
 */
export function correoDelSalon(fallback?: string | null) {
  return process.env.RESEND_SALON || fallback || "";
}

export type Correo = {
  para: string | string[];
  asunto: string;
  html: string;
  /** Para que "Responder" le escriba a la clienta y no al buzón del sitio. */
  responderA?: string | null;
};

/**
 * La versión en texto plano del correo, sacada del HTML.
 *
 * Un correo que trae HTML y texto (multipart/alternative) es lo que manda
 * cualquier sistema de citas o pedidos; uno que trae solo HTML de diseño se
 * parece más a un boletín, y Gmail lo manda a "Promociones". Además es lo que
 * leen los relojes y los lectores de pantalla más básicos.
 */
export function htmlATexto(html: string) {
  return (
    html
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      // Los saltos del código fuente no cuentan; los saltos salen de las etiquetas.
      .replace(/\s+/g, " ")
      // Dos celdas seguidas ("Servicio" | "Revitalización") quedan en una línea.
      .replace(/<\/td>\s*<td/gi, "</td> · <td")
      // El preencabezado va oculto: en texto plano sería una línea repetida.
      .replace(/<div style="display:none[\s\S]*?<\/div>/i, "")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url: string, texto: string) => {
        const limpio = texto.replace(/<[^>]+>/g, "").trim();
        // Un enlace que solo envuelve una imagen (el logo) no se escribe.
        if (!limpio) return "";
        return url.includes(limpio) ? url : `${limpio}: ${url}`;
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h1|h2|tr|table|div)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#?\w+;/g, (e) => (e === "&amp;" ? "&" : ""))
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim().replace(/^(· ?)+|( ?·)+$/g, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function enviar({ para, asunto, html, responderA }: Correo) {
  const destinos = (Array.isArray(para) ? para : [para]).filter(Boolean);
  if (destinos.length === 0) return false;

  if (!correoConfigurado()) {
    console.warn(`[correo] sin RESEND_API_KEY, no se envió "${asunto}"`);
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: remitente(),
      to: destinos,
      subject: asunto,
      html,
      text: htmlATexto(html),
      ...(responderA ? { replyTo: responderA } : {}),
    });

    if (error) {
      console.error(`[correo] Resend rechazó "${asunto}":`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    const error = e as Error;
    console.error(`[correo] falló el envío de "${asunto}":`, error?.message ?? e);
    return false;
  }
}
