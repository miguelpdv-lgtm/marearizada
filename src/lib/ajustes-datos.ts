/**
 * Ajustes que se sumaron después de la carga inicial.
 *
 * El seed crea las filas de `Setting` una sola vez; lo que se agrega después
 * no aparecería en Configuración hasta volver a correrlo contra producción.
 * Por eso estas definiciones viven acá y `asegurarAjustes()` las crea (sin
 * pisar valores ya editados) cada vez que se abre Configuración.
 */
export const AJUSTES_NUEVOS = [
  {
    key: "payroll.commissionStep",
    value: "100000",
    label: "Comisión — por cada (COP vendidos)",
    group: "operacion",
    type: "NUMBER",
    hint: "Tramo de ventas. Por cada tramo completo que venda una profesional se le asigna el valor de abajo.",
    order: 0,
  },
  {
    key: "payroll.commissionAmount",
    value: "0",
    label: "Comisión — se le asignan (COP)",
    group: "operacion",
    type: "NUMBER",
    hint: "Ej.: por cada $100.000 vendidos se le asignan $10.000. Aplica igual a todo el equipo.",
    order: 1,
  },
  {
    key: "email.avisosSalon",
    value: "false",
    label: "Enviar avisos administrativos por correo",
    group: "contacto",
    type: "BOOLEAN",
    hint: "Las citas nuevas y los cambios de cita llegan al correo de contacto. Déjalo apagado mientras haces pruebas; los correos a las clientas no dependen de esto.",
    order: 4,
  },
  {
    key: "legal.razonSocial",
    value: "",
    label: "Razón social o titular del negocio",
    group: "general",
    type: "TEXT",
    hint: "Sale en los términos y en la política de datos. Ej.: MAREA RIZADA S.A.S. o el nombre de la persona natural.",
    order: 50,
  },
  {
    key: "legal.nit",
    value: "",
    label: "NIT o cédula del titular",
    group: "general",
    type: "TEXT",
    hint: "Sale en los términos y en la política de datos.",
    order: 51,
  },
  {
    key: "legal.ciudad",
    value: "",
    label: "Ciudad del domicilio",
    group: "general",
    type: "TEXT",
    hint: "Ej.: Barranquilla, Colombia.",
    order: 52,
  },
  {
    key: "seo.googleVerification",
    value: "",
    label: "Código de verificación de Google Search Console",
    group: "seo",
    type: "TEXT",
    hint: "En Search Console → Agregar propiedad → Prefijo de URL → Etiqueta HTML. Pega la etiqueta completa o solo el código de content=\"...\".",
    order: 0,
  },
  {
    key: "seo.bingVerification",
    value: "",
    label: "Código de verificación de Bing Webmaster Tools",
    group: "seo",
    type: "TEXT",
    hint: "Opcional. Bing Webmaster Tools → Etiqueta meta. Pega la etiqueta o solo el código.",
    order: 1,
  },
] as const;

/**
 * La comisión por valor: por cada tramo completo de `paso` pesos vendidos se
 * asignan `valor` pesos. Con $250.000 vendidos, tramos de $100.000 y $10.000
 * por tramo, son $20.000 (los $50.000 sueltos no completan tramo).
 */
export function calcularComision(ventas: number, paso: number, valor: number) {
  if (paso <= 0 || valor <= 0 || ventas <= 0) return 0;
  return Math.floor(ventas / paso) * valor;
}
