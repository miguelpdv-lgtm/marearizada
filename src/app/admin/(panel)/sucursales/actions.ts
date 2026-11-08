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
  runAction,
  str,
  zodToState,
  type ActionState,
} from "@/lib/actions";

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio."),
  slug: z.string().min(2, "El enlace es obligatorio."),
  city: z.string().min(2, "La ciudad es obligatoria."),
  address: z.string().min(5, "La dirección es obligatoria."),
  googleReviewUrl: z
    .string()
    .url("Pega el enlace completo, empezando por https://")
    .nullable(),
});

/**
 * "10.99823, -74.81052" (como lo copia Google Maps) -> latitud y longitud.
 * Vacío borra las coordenadas; algo que no se entiende devuelve `null`.
 */
function leerCoordenadas(texto: string) {
  if (!texto) return { latitude: null, longitude: null };
  const partes = texto.split(/[,;\s]+/).filter(Boolean).map(Number);
  if (partes.length !== 2) return null;
  const [latitude, longitude] = partes;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

const ERROR_COORDENADAS: ActionState = {
  error: "Revisa las coordenadas.",
  fieldErrors: {
    coordenadas: ["Pégalas como las copia Google Maps: 10.99823, -74.81052"],
  },
};

function readForm(formData: FormData) {
  const name = str(formData, "name");

  return {
    name,
    slug: slugify(str(formData, "slug") || name),
    city: str(formData, "city"),
    address: str(formData, "address"),
    neighborhood: optionalStr(formData, "neighborhood"),
    phone: optionalStr(formData, "phone"),
    whatsapp: optionalStr(formData, "whatsapp"),
    email: optionalStr(formData, "email"),
    mapsUrl: optionalStr(formData, "mapsUrl"),
    region: optionalStr(formData, "region"),
    postalCode: optionalStr(formData, "postalCode"),
    googleReviewUrl: optionalStr(formData, "googleReviewUrl"),
    imageUrl: optionalStr(formData, "imageUrl"),
    description: optionalStr(formData, "description"),
    hours: optionalStr(formData, "hours"),
    closedNotice: optionalStr(formData, "closedNotice"),
    order: int(formData, "order"),
    active: bool(formData, "active"),
  };
}

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/sucursales");
  revalidatePath("/sucursales/[slug]", "page");
  revalidatePath("/sucursales/[slug]/[tema]", "page");
  revalidatePath("/reservar");
  revalidatePath("/admin/sucursales");
}

export async function createBranch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const coordenadas = leerCoordenadas(str(formData, "coordenadas"));
    if (!coordenadas) return ERROR_COORDENADAS;
    const data = { ...readForm(formData), ...coordenadas };
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    if (await prisma.branch.findUnique({ where: { slug: data.slug } })) {
      return {
        error: "Ya existe un local con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    await prisma.branch.create({ data });
    revalidateSite();
    redirect("/admin/sucursales?ok=creada");
  });
}

export async function updateBranch(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const coordenadas = leerCoordenadas(str(formData, "coordenadas"));
    if (!coordenadas) return ERROR_COORDENADAS;
    const data = { ...readForm(formData), ...coordenadas };
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const clash = await prisma.branch.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      return {
        error: "Ya existe otro local con ese enlace.",
        fieldErrors: { slug: ["Elige otro enlace."] },
      };
    }

    await prisma.branch.update({ where: { id }, data });
    revalidateSite();
    return { ok: true, message: "Local actualizado." };
  });
}

export async function deleteBranch(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  // El equipo y los usuarios asociados quedan sin sucursal, no se borran.
  await prisma.branch.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/sucursales?ok=eliminada");
}
