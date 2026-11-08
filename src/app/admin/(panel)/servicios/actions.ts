"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import { slugify } from "@/lib/format";
import {
  bool,
  int,
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
  durationMin: z.number().int().min(5, "La duración mínima es 5 minutos."),
  price: z.number().int().min(0, "El precio no puede ser negativo."),
});

function readForm(formData: FormData) {
  const name = str(formData, "name");
  const slugInput = str(formData, "slug");

  return {
    name,
    slug: slugify(slugInput || name),
    tagline: optionalStr(formData, "tagline"),
    description: str(formData, "description"),
    longDescription: optionalStr(formData, "longDescription"),
    durationMin: int(formData, "durationMin", 60),
    price: int(formData, "price"),
    priceFrom: bool(formData, "priceFrom"),
    hidePrice: bool(formData, "hidePrice"),
    imageUrl: optionalStr(formData, "imageUrl"),
    // Solo si el formulario la trae: nunca se vacía por omisión.
    ...(urlList(formData, "gallery") !== undefined ? { gallery: urlList(formData, "gallery") } : {}),
    includes: optionalStr(formData, "includes"),
    idealFor: optionalStr(formData, "idealFor"),
    categoryId: optionalStr(formData, "categoryId"),
    featured: bool(formData, "featured"),
    order: int(formData, "order"),
    active: bool(formData, "active"),
    bookable: bool(formData, "bookable"),
  };
}

/** Guarda quién realiza este servicio (reemplaza la lista completa). */
async function guardarProfesionales(serviceId: string, formData: FormData) {
  const staffIds = formData.getAll("staffIds").filter((v): v is string => typeof v === "string");
  await prisma.staffService.deleteMany({ where: { serviceId } });
  if (staffIds.length > 0) {
    await prisma.staffService.createMany({
      data: staffIds.map((staffId) => ({ staffId, serviceId })),
      skipDuplicates: true,
    });
  }
}

function revalidateSite(slug?: string) {
  revalidatePath("/");
  revalidatePath("/servicios");
  if (slug) revalidatePath(`/servicios/${slug}`);
  revalidatePath("/admin/servicios");
  // Página de cada sede y sus páginas por tema listan los servicios.
  revalidatePath("/sucursales/[slug]", "page");
  revalidatePath("/sucursales/[slug]/[tema]", "page");
  revalidatePath("/admin/equipo");
}

export async function createService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const exists = await prisma.service.findUnique({ where: { slug: data.slug } });
    if (exists) {
      return {
        error: "Ya existe un servicio con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    const creado = await prisma.service.create({ data });
    await guardarProfesionales(creado.id, formData);
    revalidateSite(data.slug);
    redirect("/admin/servicios?ok=creado");
  });
}

export async function updateService(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const clash = await prisma.service.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      return {
        error: "Ya existe otro servicio con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    await prisma.service.update({ where: { id }, data });
    await guardarProfesionales(id, formData);
    revalidateSite(data.slug);
    return { ok: true, message: "Servicio actualizado." };
  });
}

export async function deleteService(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.service.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/servicios?ok=eliminado");
}

/* --- Categorías de servicio ------------------------------------------------- */

export async function createServiceCategory(
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
    const exists = await prisma.serviceCategory.findUnique({ where: { slug } });
    if (exists) {
      return { error: "Ya existe una categoría con ese nombre." };
    }

    await prisma.serviceCategory.create({
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

export async function deleteServiceCategory(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  // Los servicios que la usaban quedan sin categoría, no se borran.
  await prisma.serviceCategory.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/servicios/categorias?ok=eliminada");
}
