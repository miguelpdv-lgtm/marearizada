import "server-only";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

/**
 * Mueve el stock de un producto en una sede puntual: actualiza
 * `ProductStock`, deja el rastro en `StockMovement` (causa, responsable) y
 * recalcula `Product.stock` como la suma de todas las sedes — el mismo
 * número que ya lee el sitio público. Usado por el ajuste manual de stock,
 * por vender un producto adicional en una cita y por una venta de mostrador.
 */
export async function moverStock({
  productId,
  branchId,
  delta,
  cause,
  comment,
  staffId,
}: {
  productId: string;
  branchId: string;
  /** Positivo = entra stock, negativo = sale (venta, merma...). */
  delta: number;
  cause: string;
  comment?: string | null;
  staffId?: string | null;
}) {
  const actual = await prisma.productStock.findUnique({
    where: { productId_branchId: { productId, branchId } },
  });
  const before = actual?.stock ?? 0;
  const after = Math.max(0, before + delta);

  await prisma.productStock.upsert({
    where: { productId_branchId: { productId, branchId } },
    update: { stock: after },
    create: { productId, branchId, stock: after },
  });
  await prisma.stockMovement.create({
    data: {
      productId,
      branchId,
      before,
      after,
      cause,
      comment: comment ?? null,
      staffId: staffId ?? null,
    },
  });

  const total = await prisma.productStock.aggregate({
    where: { productId },
    _sum: { stock: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { stock: total._sum.stock ?? 0 },
  });

  // La tienda y la portada son estáticas y leen este mismo número. Sin esto,
  // vender el último frasco en el salón no se nota en el sitio: la clienta
  // llena el carrito y se entera al final, cuando el checkout revalida
  // existencias y la rechaza.
  revalidatePath("/productos");
  revalidatePath("/");

  return { before, after };
}
