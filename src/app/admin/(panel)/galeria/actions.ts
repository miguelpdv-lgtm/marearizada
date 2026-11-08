"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import {
  bool,
  int,
  optionalStr,
  runAction,
  str,
  type ActionState,
} from "@/lib/actions";

function readForm(formData: FormData) {
  return {
    kind: str(formData, "kind") === "REEL" ? "REEL" : "IMAGE",
    imageUrl: optionalStr(formData, "imageUrl"),
    videoUrl: optionalStr(formData, "videoUrl"),
    caption: optionalStr(formData, "caption"),
    externalUrl: optionalStr(formData, "externalUrl"),
    size: ["NORMAL", "TALL", "WIDE"].includes(str(formData, "size"))
      ? str(formData, "size")
      : "NORMAL",
    order: int(formData, "order"),
    active: bool(formData, "active"),
  };
}

function revalidateSite() {
  // La galería la muestra /nosotras, que es estática. Con revalidatePath("/")
  // a secas solo se refrescaba el home y la página de nosotras se quedaba con
  // las fotos viejas.
  revalidatePath("/", "layout");
  revalidatePath("/admin/galeria");
}

export async function createGalleryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);

    if (!data.imageUrl && !data.videoUrl) {
      return {
        error: "Agrega al menos una imagen o un video.",
        fieldErrors: { imageUrl: ["Falta el material."] },
      };
    }

    await prisma.galleryItem.create({ data });
    revalidateSite();
    redirect("/admin/galeria?ok=creado");
  });
}

export async function updateGalleryItem(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);

    if (!data.imageUrl && !data.videoUrl) {
      return {
        error: "Agrega al menos una imagen o un video.",
        fieldErrors: { imageUrl: ["Falta el material."] },
      };
    }

    await prisma.galleryItem.update({ where: { id }, data });
    revalidateSite();
    return { ok: true, message: "Elemento actualizado." };
  });
}

export async function deleteGalleryItem(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.galleryItem.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/galeria?ok=eliminado");
}
