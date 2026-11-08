"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { CAUSAS_AJUSTE, canManageContent } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { moverStock } from "@/lib/stock";
import {
  bool,
  int,
  optionalInt,
  optionalStr,
  urlList,
  runAction,
  str,
  zodToState,
  type ActionState,
} from "@/lib/actions";

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio."),
  slug: z.string().min(2, "El enlace es obligatorio."),
  description: z.string().min(10, "Escribe una descripción de al menos 10 caracteres."),
  price: z.number().int().min(0, "El precio no puede ser negativo."),
});

/** El stock NO se lee ni se toca acá — en creación se calcula del stock
 * inicial por sede (ver `createProduct`), y en edición se ajusta desde
 * `ajustarStock`, nunca sobrescribiendo el formulario general. */
function readForm(formData: FormData) {
  const name = str(formData, "name");

  return {
    name,
    slug: slugify(str(formData, "slug") || name),
    brand: optionalStr(formData, "brand"),
    description: str(formData, "description"),
    longDescription: optionalStr(formData, "longDescription"),
    price: int(formData, "price"),
    compareAtPrice: optionalInt(formData, "compareAtPrice"),
    sku: optionalStr(formData, "sku"),
    // Mínimo 1 g: en 0 el envío nacional saldría gratis por error de dato.
    imageUrl: optionalStr(formData, "imageUrl"),
    // Solo si el formulario la trae: nunca se vacía por omisión.
    ...(urlList(formData, "gallery") !== undefined ? { gallery: urlList(formData, "gallery") } : {}),
    hairTypes: optionalStr(formData, "hairTypes"),
    size: optionalStr(formData, "size"),
    categoryId: optionalStr(formData, "categoryId"),
    featured: bool(formData, "featured"),
    order: int(formData, "order"),
    active: bool(formData, "active"),
    purchasable: bool(formData, "purchasable"),
  };
}

function revalidateSite() {
  revalidatePath("/");
  // "layout" refresca también cada ficha /productos/[slug].
  revalidatePath("/productos", "layout");
  revalidatePath("/admin/productos");
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    if (await prisma.product.findUnique({ where: { slug: data.slug } })) {
      return {
        error: "Ya existe un producto con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    if (data.sku && (await prisma.product.findUnique({ where: { sku: data.sku } }))) {
      return {
        error: "Ya existe un producto con ese SKU.",
        fieldErrors: { sku: ["El SKU debe ser único."] },
      };
    }

    const sedes = await prisma.branch.findMany({ where: { active: true }, select: { id: true } });
    const permitidas = new Set(sedesPermitidas(user, sedes).map((s) => s.id));
    const stockPorSede = sedes.map((s) => ({
      branchId: s.id,
      stock: permitidas.has(s.id) ? Math.max(0, optionalInt(formData, `stock_${s.id}`) ?? 0) : 0,
    }));
    const stockTotal = stockPorSede.reduce((a, s) => a + s.stock, 0);

    const producto = await prisma.product.create({ data: { ...data, stock: stockTotal } });

    await prisma.productStock.createMany({
      data: stockPorSede.map((s) => ({ productId: producto.id, branchId: s.branchId, stock: s.stock })),
    });
    await prisma.stockMovement.createMany({
      data: stockPorSede
        .filter((s) => s.stock > 0)
        .map((s) => ({
          productId: producto.id,
          branchId: s.branchId,
          before: 0,
          after: s.stock,
          cause: "Carga inicial de inventario",
        })),
    });
    revalidateSite();
    redirect("/admin/productos?ok=creado");
  });
}

export async function updateProduct(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const slugClash = await prisma.product.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (slugClash) {
      return {
        error: "Ya existe otro producto con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    if (data.sku) {
      const skuClash = await prisma.product.findFirst({
        where: { sku: data.sku, NOT: { id } },
        select: { id: true },
      });
      if (skuClash) {
        return {
          error: "Ya existe otro producto con ese SKU.",
          fieldErrors: { sku: ["El SKU debe ser único."] },
        };
      }
    }

    await prisma.product.update({ where: { id }, data });
    revalidateSite();
    return { ok: true, message: "Producto guardado exitosamente." };
  });
}

/* --- Stock por sede ---------------------------------------------------------- */

const schemaAjuste = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  stock: z.number().int().min(0, "El inventario no puede ser negativo."),
  cause: z.enum(CAUSAS_AJUSTE),
  comment: z.string().trim().max(300).optional(),
});

/** Ajusta el stock de un producto en una sede puntual: actualiza
 * `ProductStock`, deja el rastro en `StockMovement` (quién, cuándo, por
 * qué) y recalcula `Product.stock` como la suma de todas las sedes — el
 * mismo número que ya lee el sitio público. */
export async function ajustarStock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForAction(canManageContent);

    const parsed = schemaAjuste.safeParse({
      productId: str(formData, "productId"),
      branchId: str(formData, "branchId"),
      stock: int(formData, "stock"),
      cause: str(formData, "cause"),
      comment: optionalStr(formData, "comment") ?? undefined,
    });
    if (!parsed.success) return zodToState(parsed.error);
    const d = parsed.data;

    const sedes = await prisma.branch.findMany({ where: { active: true }, select: { id: true } });
    const permitidas = new Set(sedesPermitidas(user, sedes).map((s) => s.id));
    if (!permitidas.has(d.branchId)) {
      return { error: "No tienes acceso a esa sede." };
    }

    const actual = await prisma.productStock.findUnique({
      where: { productId_branchId: { productId: d.productId, branchId: d.branchId } },
    });
    const before = actual?.stock ?? 0;

    await moverStock({
      productId: d.productId,
      branchId: d.branchId,
      delta: d.stock - before,
      cause: d.cause,
      comment: d.comment,
      staffId: user.id,
    });

    revalidatePath(`/admin/productos/${d.productId}`);
    revalidateSite();
    return { ok: true, message: "Stock actualizado." };
  });
}

export async function deleteProduct(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.product.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/productos?ok=eliminado");
}

/* --- Categorías de producto ------------------------------------------------- */

export async function createProductCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const name = str(formData, "name");
    if (name.length < 2) {
      return {
        error: "Revisa los campos marcados.",
        fieldErrors: { name: ["El nombre es obligatorio."] },
      };
    }

    const slug = slugify(str(formData, "slug") || name);
    if (await prisma.productCategory.findUnique({ where: { slug } })) {
      return { error: "Ya existe una categoría con ese nombre." };
    }

    await prisma.productCategory.create({
      data: {
        name,
        slug,
        description: optionalStr(formData, "description"),
        order: int(formData, "order"),
      },
    });

    revalidateSite();
    return { ok: true, message: "Categoría creada." };
  });
}

export async function deleteProductCategory(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.productCategory.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/productos/categorias?ok=eliminada");
}
