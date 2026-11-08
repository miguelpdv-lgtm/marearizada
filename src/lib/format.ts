const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** 120000 -> "$ 120.000" */
export function formatCOP(value: number | null | undefined) {
  if (value == null) return "—";
  return copFormatter.format(value).replace(/ /g, " ");
}

/** 90 -> "1 h 30 min" */
export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/**
 * Las fechas se muestran siempre en hora de Colombia. Sin zona explícita,
 * `Intl` usa la del servidor, y Vercel corre en UTC: una factura emitida a las
 * 11:54 a. m. aparecía a las 4:54 p. m.
 */
const ZONA = "America/Bogota";

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(date));
}

// Marcas diacríticas combinantes. Se construye por código para que el archivo
// no dependa de cómo se guarden esos caracteres invisibles.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Convierte un textarea de "una línea por ítem" en arreglo. */
export function toLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Convierte "a, b, c" en arreglo. */
export function toTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Normaliza un número colombiano a formato wa.me */
export function toWhatsAppNumber(raw: string | null | undefined) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("57") ? digits : `57${digits}`;
}

/**
 * El `href` de un enlace telefónico, a partir del número como lo escribió el
 * salón en la configuración.
 *
 * El mismo valor se muestra en pantalla y se usa como enlace, y ahí chocan dos
 * necesidades: se lee mejor con espacios ("+57 311 5690094") pero un `tel:` con
 * espacios no es un URI válido (RFC 3966 solo admite `-`, `.`, `(` y `)` como
 * separadores visuales). Los navegadores lo perdonan; los lectores de pantalla
 * y algunos clientes de correo no.
 *
 * Así el salón escribe el número como quiera y el enlace sale bien igual.
 */
export function telLink(raw: string | null | undefined) {
  if (!raw) return "";
  const limpio = raw.replace(/[^\d+]/g, "");
  // Un "+" solo vale al principio.
  return limpio.startsWith("+") ? `+${limpio.replace(/\+/g, "")}` : limpio;
}

export function whatsappLink(raw: string | null | undefined, message?: string) {
  const number = toWhatsAppNumber(raw);
  if (!number) return "";
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
