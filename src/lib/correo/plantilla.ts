import "server-only";

/**
 * El envoltorio visual de los correos.
 *
 * Es HTML de correo, no HTML de web: tablas en vez de flex, estilos en línea y
 * ancho fijo. Lo que acá parece anticuado es lo único que llega igual a todos
 * lados.
 *
 * Reglas que salieron de probar en bandejas reales (2026-09-30):
 *
 *   1. **Una sola imagen y ningún bloque de color de fondo.** La versión con
 *      varias imágenes (logo, ondas) y bloques rosa/amarillo caía en
 *      Promociones; la sencilla, con texto y datos, llega a Principal. La
 *      marca va en el encabezado —el logo completo en vino sobre rosa, los
 *      colores de la foto de perfil de Instagram, como UNA imagen— y en el
 *      texto: vino con acentos rosa.
 *   2. **Siempre claro.** El correo se declara "solo claro" (`color-scheme:
 *      light only`): Apple Mail, iOS Mail y Outlook lo muestran blanco aunque
 *      el teléfono esté en modo oscuro.
 *   3. **La app de Gmail no obedece eso** y en modo oscuro recolorea todo lo
 *      que no sea imagen (fondo a gris oscuro, texto vino a rosa claro). No se
 *      puede evitar sin arriesgar la lectura: el truco de fijar el fondo como
 *      imagen deja el fondo blanco pero Gmail igual aclara el texto, y queda
 *      rosa claro sobre blanco. Por eso el diseño está pensado para que esa
 *      inversión se vea pareja: el encabezado (imagen) no cambia y todo lo
 *      demás es blanco con texto y líneas de un solo tono, sin bloques de
 *      color que se vuelvan verde oliva o morado.
 *
 * Colores del manual (`docs/DESIGN_SYSTEM.md`): vino #5b001d, rosa #df9dbd,
 * rosa 300 #ecc4d7.
 */

const VINO = "#5b001d";
const ROSA = "#df9dbd";
const ROSA_SUAVE = "#ecc4d7";
const BLANCO = "#ffffff";
const SUAVE = "#7f384f";

const SERIF = "'Playfair Display',Georgia,'Times New Roman',serif";
const SANS = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Una fila de "etiqueta: valor" de las que arman el resumen de una cita o un pedido. */
export function fila(etiqueta: string, valor: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${ROSA_SUAVE};color:${SUAVE};font-family:${SANS};font-size:14px;vertical-align:top;white-space:nowrap;">${escapar(etiqueta)}</td>
      <td class="em-dato" style="padding:10px 0 10px 16px;border-bottom:1px solid ${ROSA_SUAVE};color:${VINO};font-family:${SANS};font-size:14px;font-weight:600;vertical-align:top;">${valor}</td>
    </tr>`;
}

/** Botón píldora de contorno vino: sin fondo, para que Gmail oscuro no lo recoloree raro. */
export function boton(texto: string, url: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
      <tr><td style="border:2px solid ${VINO};border-radius:999px;">
        <a href="${escapar(url)}" style="display:inline-block;padding:11px 26px;color:${VINO};font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;">${escapar(texto)}</a>
      </td></tr>
    </table>`;
}

export function parrafo(texto: string) {
  return `<p style="margin:0 0 14px;color:${VINO};font-family:${SANS};font-size:15px;line-height:1.65;">${texto}</p>`;
}

export function tablaDatos(filas: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border-top:1px solid ${ROSA_SUAVE};">${filas}</table>`;
}

/** Dirección pública del sitio, para las imágenes (en un correo van absolutas). */
function sitio() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.amicrespa.com").replace(/\/+$/, "");
}

/** Los enlaces del pie. Todos opcionales: se muestra lo que haya. */
export type Pie = {
  whatsapp?: string | null;
  instagram?: string | null;
  sitio?: string | null;
  /** Por qué le llega este correo. Ayuda a que no se lea como publicidad. */
  motivo?: string;
};

function enlacePie(texto: string, url: string) {
  return `<a href="${escapar(url)}" style="color:${VINO};font-weight:600;text-decoration:underline;">${escapar(texto)}</a>`;
}

/*
 * Solo dos ajustes fuera de línea:
 *  · iOS convierte direcciones, fechas y teléfonos en enlaces azules; acá
 *    heredan el color del texto.
 *  · En pantallas angostas se reduce el margen lateral.
 */
const ESTILOS = `
  :root { color-scheme: light only; supported-color-schemes: light only; }
  a[x-apple-data-detectors], .em-dato a { color: inherit !important; text-decoration: none !important; font: inherit !important; }
  u + #cuerpo a { color: inherit; text-decoration: none; }
  @media (max-width: 600px) {
    .em-caja { padding-left:22px !important; padding-right:22px !important; }
  }
`;

/**
 * Envuelve el contenido de un correo.
 *
 * `preencabezado` es el texto que la bandeja muestra al lado del asunto antes
 * de abrir. Si no se pone, Gmail rellena con la primera línea del cuerpo.
 * `etiqueta` es la línea pequeña en mayúsculas sobre el titular, como las del
 * manual. `despedida` firma el correo con la voz de la marca: va en los que
 * le llegan a la clienta, no en los avisos internos al salón.
 */
export function plantilla({
  titulo,
  preencabezado,
  cuerpo,
  etiqueta,
  despedida = false,
  pie,
}: {
  titulo: string;
  preencabezado: string;
  cuerpo: string;
  etiqueta?: string;
  despedida?: boolean;
  pie?: Pie;
}) {
  const enlaces = [
    pie?.whatsapp ? enlacePie("WhatsApp", pie.whatsapp) : "",
    pie?.instagram ? enlacePie("Instagram", pie.instagram) : "",
    pie?.sitio ? enlacePie(pie.sitio.replace(/^https?:\/\/(www\.)?/, ""), pie.sitio) : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<meta name="format-detection" content="telephone=no,address=no,date=no,email=no">
<title>${escapar(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>${ESTILOS}</style>
</head>
<body id="cuerpo" style="margin:0;padding:0;background:${BLANCO};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(preencabezado)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BLANCO}" style="background:${BLANCO};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BLANCO}" style="max-width:540px;background:${BLANCO};border:1px solid ${ROSA_SUAVE};">

        <tr><td bgcolor="${ROSA}" style="background:${ROSA};line-height:0;font-size:0;">
          <img src="${sitio()}/brand/correo-cabecera-rosa.png" width="540" alt="Amicrespa" style="display:block;width:100%;max-width:540px;height:auto;border:0;color:${VINO};font-family:${SERIF};font-size:22px;font-weight:700;letter-spacing:.2em;line-height:1.4;">
        </td></tr>

        <tr><td class="em-caja" style="padding:34px 36px 26px;">
          ${etiqueta ? `<p style="margin:0 0 10px;color:${SUAVE};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">${escapar(etiqueta)}</p>` : ""}
          <h1 style="margin:0 0 18px;color:${VINO};font-family:${SERIF};font-size:27px;line-height:1.2;font-weight:700;">${escapar(titulo)}</h1>
          ${cuerpo}
          ${
            despedida
              ? `<p style="margin:26px 0 0;color:${VINO};font-family:${SANS};font-size:15px;line-height:1.6;">Con cariño,<br><span style="font-family:${SERIF};font-size:17px;font-weight:700;">el equipo de Amicrespa</span></p>`
              : ""
          }
        </td></tr>

        <tr><td class="em-caja" style="padding:20px 36px 26px;border-top:1px solid ${ROSA_SUAVE};color:${SUAVE};font-family:${SANS};font-size:12px;line-height:1.7;">
          ${enlaces.length ? `<p style="margin:0 0 6px;">${enlaces.join(" &nbsp;·&nbsp; ")}</p>` : ""}
          <p style="margin:0;">Salón especializado en cabello crespo, rizado y ondulado · Barranquilla y Cali</p>
          ${pie?.motivo ? `<p style="margin:6px 0 0;">${escapar(pie.motivo)}</p>` : ""}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
