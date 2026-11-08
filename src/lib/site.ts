import "server-only";

import { cache } from "react";
import type { Product } from "@prisma/client";

import { prisma } from "@/lib/db";
import { mejorDescuento, promocionesVigentes } from "@/lib/promociones";

/** Mapa de configuración con accesos tipados. */
export class SiteSettings {
  private map: Map<string, string>;

  constructor(entries: { key: string; value: string }[]) {
    this.map = new Map(entries.map((e) => [e.key, e.value]));
  }

  get(key: string, fallback = "") {
    const value = this.map.get(key);
    return value === undefined || value === "" ? fallback : value;
  }

  /** El valor tal cual está guardado; `fallback` solo si la clave no existe
   * (un valor vacío guardado a propósito se respeta). */
  raw(key: string, fallback = "") {
    return this.map.get(key) ?? fallback;
  }

  bool(key: string) {
    return this.map.get(key) === "true";
  }

  num(key: string, fallback = 0) {
    const value = Number(this.map.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}

/**
 * URL pública del sitio, sin barra final. Se usa para armar las direcciones
 * absolutas que necesita Bold (a dónde devolver a la clienta después de pagar).
 */
export function urlSitio() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export const getSettings = cache(async () => {
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true },
  });
  return new SiteSettings(rows);
});

export const getMediaSlots = cache(async () => {
  const rows = await prisma.mediaSlot.findMany({ orderBy: { order: "asc" } });
  return new Map(rows.map((r) => [r.key, r]));
});

export type MediaSlotRecord = Awaited<
  ReturnType<typeof getMediaSlots>
> extends Map<string, infer T>
  ? T
  : never;

/**
 * Servicios destacados para la portada.
 * Los servicios existen por sede, así que se muestra uno por nombre para no
 * repetir la misma tarjeta dos veces.
 */
export const getFeaturedServices = cache(async () => {
  const todos = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: { category: true },
  });

  const vistos = new Set<string>();
  const unicos = todos.filter((s) => {
    if (vistos.has(s.name)) return false;
    vistos.add(s.name);
    return true;
  });

  return unicos.slice(0, 6);
});

export const getAllServices = cache(async () =>
  prisma.service.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }],
    include: { category: true, branch: { select: { id: true, city: true } } },
  }),
);

export const getServiceCategories = cache(async () =>
  prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  }),
);

/**
 * Aplica las promociones vigentes de la tienda a una lista de productos.
 *
 * En vez de agregarle campos nuevos al producto, se reescriben los dos que la
 * tarjeta ya sabe pintar: `price` pasa a ser el precio con descuento y
 * `compareAtPrice` el de lista, que es exactamente la forma en que el sitio ya
 * muestra un precio tachado. Así la promoción se ve en la tienda, en la
 * portada y en el carrito sin tocar ningún componente.
 *
 * Es solo presentación: lo que se cobra se vuelve a resolver contra la base en
 * `crearPedido`. Si alguien edita el carrito en localStorage, el precio que
 * manda no se usa para nada.
 */
async function conPromociones<T extends Product>(productos: T[]): Promise<T[]> {
  const promociones = await promocionesVigentes();
  if (promociones.length === 0) return productos;

  return productos.map((p) => {
    const promo = mejorDescuento(
      { tipo: "PRODUCTO", id: p.id, categoriaId: p.categoryId, precio: p.price },
      promociones,
      "TIENDA",
    );
    if (!promo) return p;

    return {
      ...p,
      price: promo.precioFinal,
      // El precio de lista gana sobre el `compareAtPrice` que haya cargado el
      // panel: la comparación honesta es contra lo que costaría hoy sin la
      // promoción, no contra un precio anterior que ya no existe.
      compareAtPrice: p.price,
    };
  });
}

export const getFeaturedProducts = cache(async () =>
  conPromociones(
    await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: { category: true },
      take: 8,
    }),
  ),
);

export const getAllProducts = cache(async () =>
  conPromociones(
    await prisma.product.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { category: true },
    }),
  ),
);

/** Un producto activo por su slug, con la promoción vigente ya aplicada. */
export const getProduct = cache(async (slug: string) => {
  const producto = await prisma.product.findFirst({
    where: { slug, active: true },
    include: { category: true },
  });
  if (!producto) return null;
  const [conPromo] = await conPromociones([producto]);
  return conPromo;
});

/** Otros productos de la misma categoría, para "también te puede servir". */
export const getRelatedProducts = cache(async (productId: string, categoryId: string | null) =>
  conPromociones(
    await prisma.product.findMany({
      where: {
        active: true,
        id: { not: productId },
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: { category: true },
      take: 4,
    }),
  ),
);

export const getTeam = cache(async () =>
  prisma.teamMember.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { branch: { select: { city: true } } },
  }),
);

export const getTestimonials = cache(async () =>
  prisma.testimonial.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { order: "asc" }],
  }),
);

export const getGallery = cache(async () =>
  prisma.galleryItem.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  }),
);

export const getBranches = cache(async () =>
  prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  }),
);

/**
 * Destino del botón "Reserva tu cita".
 * Fase 1: enlace externo (Agenda Pro) o WhatsApp.
 * Fase 2: agenda propia en /reservar.
 */
export function bookingTarget(settings: SiteSettings) {
  if (settings.bool("phase.bookingEnabled")) {
    return { href: "/reservar", external: false, ready: true as const };
  }

  const external = settings.get("phase.bookingUrl");
  if (external) {
    return { href: external, external: true, ready: true as const };
  }

  const whatsapp = settings.get("contact.whatsapp");
  const message = settings.get(
    "contact.whatsappMessage",
    "¡Hola Amicrespa! Quiero agendar una cita.",
  );
  const digits = whatsapp.replace(/\D/g, "");
  const number = digits.startsWith("57") ? digits : `57${digits}`;

  return {
    href: digits ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#contacto",
    external: Boolean(digits),
    ready: false as const,
  };
}
