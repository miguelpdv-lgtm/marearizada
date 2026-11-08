import "server-only";

import { prisma } from "@/lib/db";

import type { Catalogo } from "./PromocionForm";

/**
 * Las opciones de los selectores de destino del formulario.
 *
 * Los servicios se etiquetan con su sede porque existen por sede: hay dos
 * "Corte rizo a rizo", uno de Barranquilla y otro de Cali, y sin la ciudad el
 * selector muestra dos opciones idénticas.
 */
export async function catalogoParaPromociones(): Promise<Catalogo> {
  const [productos, servicios, categoriasProducto, categoriasServicio] =
    await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, brand: true },
      }),
      prisma.service.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, branch: { select: { city: true } } },
      }),
      prisma.productCategory.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true },
      }),
      prisma.serviceCategory.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return {
    productos: productos.map((p) => ({
      id: p.id,
      label: p.brand ? `${p.name} · ${p.brand}` : p.name,
    })),
    servicios: servicios.map((s) => ({
      id: s.id,
      label: s.branch?.city ? `${s.name} · ${s.branch.city}` : s.name,
    })),
    categoriasProducto: categoriasProducto.map((c) => ({ id: c.id, label: c.name })),
    categoriasServicio: categoriasServicio.map((c) => ({ id: c.id, label: c.name })),
  };
}
