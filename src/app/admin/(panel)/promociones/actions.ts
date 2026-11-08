"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import {
  bool,
  int,
  optionalStr,
  runAction,
  str,
  zodToState,
  type ActionState,
} from "@/lib/actions";

/**
 * CRUD de promociones.
 *
 * La forma del modelo obliga a una validación cruzada: `scope` decide cuál de
 * los cuatro campos de destino es obligatorio y cuáles tienen que quedar en
 * null. Guardar una promoción con alcance PRODUCTO y además un `serviceId`
 * pegado de una edición anterior dejaría una fila que el resolvedor de precios
 * interpreta distinto de lo que se ve en el formulario.
 */

const ALCANCES = [
  "TODO",
  "PRODUCTO",
  "SERVICIO",
  "CATEGORIA_PRODUCTO",
  "CATEGORIA_SERVICIO",
] as const;

const schema = z
  .object({
    name: z.string().min(3, "Ponle un nombre que el equipo reconozca."),
    kind: z.enum(["PORCENTAJE", "MONTO"]),
    value: z.number().int().positive("El descuento tiene que ser mayor que cero."),
    scope: z.enum(ALCANCES),
    productId: z.string().nullable(),
    serviceId: z.string().nullable(),
    productCategoryId: z.string().nullable(),
    serviceCategoryId: z.string().nullable(),
    channel: z.enum(["AMBOS", "TIENDA", "MOSTRADOR"]),
    startsAt: z.date().nullable(),
    endsAt: z.date().nullable(),
    active: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "PORCENTAJE" && d.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Un porcentaje no puede pasar de 100.",
      });
    }

    // Cada alcance exige su destino. Sin esto, una promoción de alcance
    // PRODUCTO sin producto no cubriría nada y se vería activa en el listado.
    const exigido: Partial<Record<(typeof ALCANCES)[number], [string, string]>> = {
      PRODUCTO: ["productId", "Elige el producto."],
      SERVICIO: ["serviceId", "Elige el servicio."],
      CATEGORIA_PRODUCTO: ["productCategoryId", "Elige la categoría de productos."],
      CATEGORIA_SERVICIO: ["serviceCategoryId", "Elige la categoría de servicios."],
    };
    const falta = exigido[d.scope];
    if (falta && !d[falta[0] as keyof typeof d]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [falta[0]],
        message: falta[1],
      });
    }

    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "La fecha de fin va después de la de inicio.",
      });
    }
  });

/**
 * "2026-09-21" → Date. `finDelDia` la lleva a las 23:59 de ese día en hora de
 * Colombia: si el salón escribe que la promoción termina el 30, espera que el
 * 30 todavía valga, no que se apague a la medianoche del 29.
 */
function fecha(valor: string | null, finDelDia = false) {
  if (!valor) return null;
  const [a, m, d] = valor.split("-").map(Number);
  if (!a || !m || !d) return null;
  // +5 porque Colombia es UTC-5 y las fechas se guardan en UTC.
  return finDelDia
    ? new Date(Date.UTC(a, m - 1, d, 23 + 5, 59))
    : new Date(Date.UTC(a, m - 1, d, 5, 0));
}

function readForm(formData: FormData) {
  const scope = str(formData, "scope") as (typeof ALCANCES)[number];

  // Solo sobrevive el destino que corresponde al alcance elegido. Los demás
  // se limpian a null aunque el formulario los haya mandado con valor.
  const destino = {
    productId: scope === "PRODUCTO" ? optionalStr(formData, "productId") : null,
    serviceId: scope === "SERVICIO" ? optionalStr(formData, "serviceId") : null,
    productCategoryId:
      scope === "CATEGORIA_PRODUCTO" ? optionalStr(formData, "productCategoryId") : null,
    serviceCategoryId:
      scope === "CATEGORIA_SERVICIO" ? optionalStr(formData, "serviceCategoryId") : null,
  };

  return {
    name: str(formData, "name"),
    kind: str(formData, "kind"),
    value: int(formData, "value"),
    scope,
    ...destino,
    channel: str(formData, "channel"),
    startsAt: fecha(optionalStr(formData, "startsAt")),
    endsAt: fecha(optionalStr(formData, "endsAt"), true),
    active: bool(formData, "active"),
  };
}

/**
 * Una promoción cambia precios en el sitio, y el sitio es estático. Sin esto,
 * crearla no se vería hasta el próximo despliegue.
 */
function revalidarTodo() {
  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/servicios");
  revalidatePath("/admin/promociones");
}

export async function crearPromocion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const parsed = schema.safeParse(readForm(formData));
    if (!parsed.success) return zodToState(parsed.error);

    await prisma.promotion.create({ data: parsed.data });
    revalidarTodo();
    redirect("/admin/promociones?ok=creada");
  });
}

export async function actualizarPromocion(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const parsed = schema.safeParse(readForm(formData));
    if (!parsed.success) return zodToState(parsed.error);

    await prisma.promotion.update({ where: { id }, data: parsed.data });
    revalidarTodo();
    return { ok: true, message: "Promoción actualizada." };
  });
}

export async function eliminarPromocion(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.promotion.delete({ where: { id } });
  revalidarTodo();
  redirect("/admin/promociones?ok=eliminada");
}

/** Apagar y encender desde el listado, sin entrar a la ficha. */
export async function alternarPromocion(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  const actual = await prisma.promotion.findUnique({ where: { id } });
  if (!actual) return;

  await prisma.promotion.update({
    where: { id },
    data: { active: !actual.active },
  });
  revalidarTodo();
}
