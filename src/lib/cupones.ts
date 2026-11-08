import "server-only";

import type { Promotion } from "@prisma/client";

import { prisma } from "@/lib/db";
import { mejorDescuento, promocionesVigentes, type Descuento } from "@/lib/promociones";

/** "  verano 20 " → "VERANO20". */
export function normalizarCupon(texto: string) {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 30);
}

/** Citas activas que ya usaron esta promoción (las canceladas no cuentan). */
async function usos(promotionId: string) {
  return prisma.appointment.count({
    where: { promotionId, status: { not: "CANCELADA" } },
  });
}

export type ResultadoDescuento =
  | { ok: true; descuento: Descuento | null }
  | { ok: false; error: string };

/**
 * El descuento de una reserva en línea: la mejor promoción automática (sin
 * código) o, si la clienta escribió un cupón, ese cupón cuando rebaja más.
 * Un cupón que no existe, venció, no cubre el servicio o se agotó devuelve un
 * error con el motivo, para mostrárselo tal cual.
 */
export async function descuentoReserva(
  servicio: { id: string; categoryId: string | null; price: number },
  cupon?: string | null,
): Promise<ResultadoDescuento> {
  const promociones = await promocionesVigentes();
  const item = { tipo: "SERVICIO" as const, id: servicio.id, categoriaId: servicio.categoryId, precio: servicio.price };

  const automaticas = promociones.filter((p) => !p.code);
  let mejor = mejorDescuento(item, automaticas, "TIENDA");
  // Una automática con cupo agotado no aplica.
  if (mejor?.promocion.maxUses != null && (await usos(mejor.promocion.id)) >= mejor.promocion.maxUses) {
    mejor = mejorDescuento(
      item,
      automaticas.filter((p) => p.id !== mejor!.promocion.id),
      "TIENDA",
    );
  }

  const codigo = cupon ? normalizarCupon(cupon) : "";
  if (!codigo) return { ok: true, descuento: mejor };

  const promo: Promotion | null = await prisma.promotion.findUnique({ where: { code: codigo } });
  if (!promo || !promo.active) return { ok: false, error: "Ese cupón no existe o ya no está activo." };
  if (!promociones.some((p) => p.id === promo.id)) {
    return { ok: false, error: "Ese cupón no está vigente en este momento." };
  }
  if (promo.channel === "MOSTRADOR") return { ok: false, error: "Ese cupón solo vale en el salón." };
  const conCupon = mejorDescuento(item, [promo], "TIENDA");
  if (!conCupon) return { ok: false, error: "Ese cupón no aplica para este servicio." };
  if (promo.maxUses != null && (await usos(promo.id)) >= promo.maxUses) {
    return { ok: false, error: "Ese cupón ya se usó todas las veces que permitía." };
  }

  // No se acumulan: gana el que más rebaja.
  return { ok: true, descuento: !mejor || conCupon.monto >= mejor.monto ? conCupon : mejor };
}
