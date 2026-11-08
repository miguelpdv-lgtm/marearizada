/**
 * Valores válidos para los campos "tipo" del modelo.
 * Viven aquí porque SQLite no soporta enums de Prisma.
 */

export const ROLES = ["ADMIN", "EDITOR", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor de contenido",
  STAFF: "Equipo del salón",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: "Acceso total: catálogo, contenido, usuarios y configuración.",
  EDITOR: "Gestiona servicios, productos y contenido del sitio.",
  STAFF: "Solo consulta. Puede ver el panel sin editar.",
};

export function canManageUsers(role: string) {
  return role === "ADMIN";
}

export function canManageSettings(role: string) {
  return role === "ADMIN";
}

/** Servicios, productos, equipo, testimonios, galería, sucursales, medios. */
export function canManageContent(role: string) {
  return role === "ADMIN" || role === "EDITOR";
}

export const MEDIA_KINDS = ["VIDEO", "IMAGE", "REEL"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  VIDEO: "🎥 Video",
  IMAGE: "📷 Fotografía",
  REEL: "🎥 Reel vertical",
};

export const GALLERY_SIZES = ["NORMAL", "TALL", "WIDE"] as const;
export type GallerySize = (typeof GALLERY_SIZES)[number];

export const GALLERY_SIZE_LABEL: Record<GallerySize, string> = {
  NORMAL: "Cuadrada",
  TALL: "Vertical (alta)",
  WIDE: "Horizontal (ancha)",
};

/** Causas posibles de un ajuste de inventario (`StockMovement.cause`). */
export const CAUSAS_AJUSTE = ["Ajuste manual", "Compra", "Venta", "Merma"] as const;

/** Cómo se cobró una venta de mostrador o una cita atendida, cargado a mano
 * por el equipo. EN_LINEA es lo que entró en línea: el abono de una cita, que en
 * caja se registra como una parte más del pago. */
export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "DATAFONO", "EN_LINEA"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DATAFONO: "Tarjeta (datáfono)",
  EN_LINEA: "Abono en línea",
};

/**
 * Lo que todavía no existe.
 *
 * Esta lista es solo de pendientes: en cuanto algo se entrega, sale de acá.
 * Tenerlo al revés confunde a quien se está capacitando —el panel le dice que
 * no existe algo que acaba de aprender a usar—, que es justo lo que pasaba
 * cuando agenda, facturación y reportes seguían apareciendo como "próximamente"
 * meses después de estar funcionando.
 */
export const PHASE_FLAGS = {
  newsletter: {
    phase: 4,
    label: "Newsletter y campañas",
    detail: "Envíos masivos a la base de clientas.",
  },
  whatsapp: {
    phase: 4,
    label: "Avisos por WhatsApp",
    detail: "Hoy los avisos salen por correo. WhatsApp necesita la API de Business.",
  },
} as const;
