import type { Promotion } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Resolución de precios con promociones.
 *
 * La regla de oro: **el precio nunca se calcula en el navegador**. Tanto la
 * reserva en línea como la venta en caja vuelven a resolver el precio contra
 * la base. Lo que se
 * muestra en el sitio es informativo; lo que se cobra sale de acá.
 */

export const TIPOS_PROMOCION = { PORCENTAJE: "Porcentaje", MONTO: "Monto fijo" } as const;
/** TIENDA es el canal en línea: las reservas del sitio. */
export const CANALES = { AMBOS: "Reservas en línea y caja", TIENDA: "Solo reservas en línea", MOSTRADOR: "Solo caja" } as const;
export const ALCANCES = {
  TODO: "Todo el catálogo",
  PRODUCTO: "Un producto",
  SERVICIO: "Un servicio",
  CATEGORIA_PRODUCTO: "Una categoría de productos",
  CATEGORIA_SERVICIO: "Una categoría de servicios",
} as const;

export type Canal = keyof typeof CANALES;

/** Lo mínimo que hay que saber de un ítem para saber si una promoción lo cubre. */
export type ItemPromocionable = {
  tipo: "PRODUCTO" | "SERVICIO";
  id: string;
  categoriaId: string | null;
  /** Precio de lista, con IVA incluido. */
  precio: number;
};

function vigente(p: Promotion, cuando: Date) {
  if (!p.active) return false;
  if (p.startsAt && cuando < p.startsAt) return false;
  // `endsAt` se compara contra el instante guardado: si el salón quiere que
  // valga todo el último día, guarda las 23:59 de ese día.
  if (p.endsAt && cuando > p.endsAt) return false;
  return true;
}

function cubre(p: Promotion, item: ItemPromocionable) {
  switch (p.scope) {
    case "TODO":
      return true;
    case "PRODUCTO":
      return item.tipo === "PRODUCTO" && p.productId === item.id;
    case "SERVICIO":
      return item.tipo === "SERVICIO" && p.serviceId === item.id;
    case "CATEGORIA_PRODUCTO":
      return item.tipo === "PRODUCTO" && !!item.categoriaId && p.productCategoryId === item.categoriaId;
    case "CATEGORIA_SERVICIO":
      return item.tipo === "SERVICIO" && !!item.categoriaId && p.serviceCategoryId === item.categoriaId;
    default:
      return false;
  }
}

/** Cuánto rebaja esta promoción a un precio, en pesos. Nunca deja el precio bajo cero. */
function rebaja(p: Promotion, precio: number) {
  const bruto = p.kind === "PORCENTAJE" ? Math.round((precio * p.value) / 100) : p.value;
  return Math.max(0, Math.min(precio, bruto));
}

export type Descuento = {
  /** Pesos a rebajar del precio unitario. */
  monto: number;
  /** Precio ya rebajado. */
  precioFinal: number;
  promocion: Promotion;
};

/**
 * La mejor promoción aplicable a un ítem, o null.
 *
 * Gana la que más rebaja y no se acumulan: dos promociones del 50% sumadas
 * dejarían el producto gratis sin que nadie lo haya decidido.
 */
export function mejorDescuento(
  item: ItemPromocionable,
  promociones: Promotion[],
  canal: Canal,
  cuando = new Date(),
): Descuento | null {
  let mejor: Descuento | null = null;

  for (const p of promociones) {
    // Los cupones (con código) solo cuentan cuando alguien escribió el código;
    // eso lo decide quien llama, filtrando la lista.
    if (p.channel !== "AMBOS" && p.channel !== canal) continue;
    if (!vigente(p, cuando)) continue;
    if (!cubre(p, item)) continue;

    const monto = rebaja(p, item.precio);
    if (monto <= 0) continue;
    if (!mejor || monto > mejor.monto) {
      mejor = { monto, precioFinal: item.precio - monto, promocion: p };
    }
  }

  return mejor;
}

/**
 * Promociones que vale la pena evaluar: las activas cuya ventana incluye el
 * momento pedido. Se traen todas de una porque son pocas (decenas, no miles) y
 * así resolver un carrito entero no hace una consulta por ítem.
 */
export async function promocionesVigentes(cuando = new Date()) {
  return prisma.promotion.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: cuando } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: cuando } }] },
      ],
    },
  });
}

/** Etiqueta corta para mostrar la promoción en el sitio y en el panel. */
export function etiquetaPromocion(p: Promotion) {
  return p.kind === "PORCENTAJE" ? `-${p.value}%` : `-$${p.value.toLocaleString("es-CO")}`;
}
