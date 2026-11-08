/**
 * Tipos de documento de identificación de la DIAN (tabla 3.2 del anexo
 * técnico de facturación electrónica). Los códigos son los que espera Siigo
 * en `customer.id_type` al crear una factura, así que se guardan tal cual en
 * la base: si acá se guardara "CC" habría que traducirlo en cada emisión.
 *
 * La lista está recortada a lo que de verdad aparece en un mostrador de
 * salón. La DIAN define más (registro civil, NIT de otro país, NUIP…), pero
 * pedirlos en el checkout solo agrega ruido.
 */
export const TIPOS_DOCUMENTO = [
  { codigo: "13", label: "Cédula de ciudadanía", corto: "C.C.", numerico: true },
  { codigo: "22", label: "Cédula de extranjería", corto: "C.E.", numerico: true },
  { codigo: "31", label: "NIT", corto: "NIT", numerico: true },
  { codigo: "41", label: "Pasaporte", corto: "Pasaporte", numerico: false },
  { codigo: "47", label: "Permiso especial de permanencia", corto: "PEP", numerico: false },
] as const;

export type CodigoDocumento = (typeof TIPOS_DOCUMENTO)[number]["codigo"];

export const CODIGOS_DOCUMENTO = TIPOS_DOCUMENTO.map((t) => t.codigo) as readonly string[];

export const TIPO_DOCUMENTO_POR_DEFECTO: CodigoDocumento = "13";

export function etiquetaDocumento(codigo: string | null | undefined) {
  return TIPOS_DOCUMENTO.find((t) => t.codigo === codigo)?.corto ?? "Documento";
}

/**
 * Deja el número como lo quiere la DIAN: sin puntos, guiones ni espacios.
 *
 * Al NIT se le quita el dígito de verificación cuando viene pegado
 * ("901443375-1" → "901443375"). Siigo lo calcula solo y rechaza el número si
 * se lo mandan con el DV incluido.
 */
export function normalizarDocumento(codigo: string, valor: string) {
  const limpio = valor.trim().replace(/[\s.]/g, "");
  if (codigo === "31") {
    const sinDv = limpio.replace(/-\d$/, "");
    return sinDv.replace(/\D/g, "");
  }
  const tipo = TIPOS_DOCUMENTO.find((t) => t.codigo === codigo);
  if (tipo?.numerico) return limpio.replace(/\D/g, "");
  return limpio.replace(/-/g, "").toUpperCase();
}

/** Mensaje de error si el documento no sirve; `null` si está bien. */
export function validarDocumento(codigo: string, valor: string): string | null {
  const tipo = TIPOS_DOCUMENTO.find((t) => t.codigo === codigo);
  if (!tipo) return "Elige un tipo de documento.";
  const n = normalizarDocumento(codigo, valor);
  if (tipo.numerico) {
    if (n.length < 5 || n.length > 15) return `Escribe un número de ${tipo.corto} válido.`;
  } else {
    if (n.length < 5 || n.length > 20) return `Escribe un ${tipo.corto} válido.`;
  }
  return null;
}

/**
 * A quién se le factura cuando la clienta no da documento. Es la salida
 * estándar en Colombia para ventas de mostrador: la DIAN acepta la factura
 * electrónica a nombre de "consumidor final" con la identificación 222222222222
 * y tipo cédula.
 *
 * En la tienda en línea no se usa: allá el documento es obligatorio, porque el
 * pedido ya viene con nombre, correo y dirección y no hay razón para renunciar
 * a identificar la venta.
 */
export const CONSUMIDOR_FINAL = {
  idType: "13",
  identification: "222222222222",
  nombre: "Consumidor final",
} as const;

/** Valor del selector de mostrador que significa "no pedir documento". */
export const SIN_DOCUMENTO = "";
