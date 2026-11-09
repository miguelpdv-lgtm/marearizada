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
    key: "email.avisosSalon",
    value: "false",
    label: "Enviar avisos administrativos por correo",
    group: "contacto",
    type: "BOOLEAN",
    hint: "Las citas nuevas y los cambios de cita llegan al correo de contacto. Déjalo apagado mientras haces pruebas; los correos a las clientas no dependen de esto.",
    order: 4,
  },
  {
    key: "booking.abonoPorcentaje",
    value: "50",
    label: "Abono para reservar (% del servicio)",
    group: "fases",
    type: "NUMBER",
    hint: "Lo que se paga en línea para confirmar la cita. Se redondea a miles y nunca baja de $10.000 (salvo servicios más baratos, que se pagan completos). La clienta también puede pagar el total.",
    order: 5,
  },
  {
    key: "booking.minutosParaPagar",
    value: "20",
    label: "Minutos para pagar el abono",
    group: "fases",
    type: "NUMBER",
    hint: "Mientras la clienta paga, el cupo queda apartado este tiempo. Si no paga, se libera solo.",
    order: 6,
  },
  {
    key: "email.recordatorios",
    value: "true",
    label: "Recordatorio por correo el día anterior a la cita",
    group: "contacto",
    type: "BOOLEAN",
    hint: "Sale una vez al día con el trabajo programado. Incluye el botón para cambiar la cita.",
    order: 5,
  },
  {
    key: "email.resenas",
    value: "true",
    label: "Pedir reseña por correo después de la visita",
    group: "contacto",
    type: "BOOLEAN",
    hint: "Les llega a las citas que quedaron como atendidas. Las reseñas entran a Contenido → Historias para que las apruebes.",
    order: 6,
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
    value: "Cartagena, Colombia",
    label: "Ciudad del domicilio",
    group: "general",
    type: "TEXT",
    hint: "Ej.: Cartagena, Colombia.",
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
