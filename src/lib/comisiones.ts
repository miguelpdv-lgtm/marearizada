import "server-only";

import { prisma } from "@/lib/db";

/**
 * Comisiones por servicio.
 *
 * Cada servicio que hace una profesional le deja un porcentaje de lo que se
 * cobró: el de su categoría (Cabello 30 %, Nails 50 %, Cejas 50 %, Pestañas
 * 50 %, Depilación 40 %) o el propio del servicio si se le puso uno. Los
 * productos no comisionan.
 *
 * Al vender, cada línea guarda el % vigente (`SaleItem.commissionPercent`):
 * cambiar después el % de una categoría no recalcula lo que ya se pagó.
 */

type ConPorcentaje = {
  commissionPercent: number | null;
  category: { commissionPercent: number | null } | null;
};

/** El % que le toca a un servicio: el suyo, si no el de su categoría, si no 0. */
export function porcentajeDe(servicio: ConPorcentaje | null | undefined) {
  if (!servicio) return 0;
  return servicio.commissionPercent ?? servicio.category?.commissionPercent ?? 0;
}

/** Pesos de comisión sobre lo cobrado. */
export function comision(valor: number, porcentaje: number) {
  return Math.round((Math.max(0, valor) * porcentaje) / 100);
}

/** Select de Prisma con lo necesario para `porcentajeDe`. */
export const SELECT_PORCENTAJE = {
  commissionPercent: true,
  category: { select: { commissionPercent: true } },
} as const;

/**
 * Agrega a las líneas de una venta el % vigente de cada servicio, para
 * guardarlo como foto. Productos, 0.
 */
export async function conPorcentajes<T extends { kind: string; serviceId?: string | null }>(lineas: T[]) {
  const ids = [...new Set(lineas.filter((l) => l.kind === "SERVICE" && l.serviceId).map((l) => l.serviceId!))];
  const servicios = ids.length
    ? await prisma.service.findMany({ where: { id: { in: ids } }, select: { id: true, ...SELECT_PORCENTAJE } })
    : [];
  const porId = new Map(servicios.map((s) => [s.id, porcentajeDe(s)]));
  return lineas.map((l) => ({
    ...l,
    commissionPercent: l.kind === "SERVICE" && l.serviceId ? (porId.get(l.serviceId) ?? 0) : 0,
  }));
}
