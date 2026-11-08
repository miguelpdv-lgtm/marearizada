"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import { optionalStr, runAction, str, type ActionState } from "@/lib/actions";

export async function updateMediaSlot(
  key: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const url = optionalStr(formData, "url");
    const posterUrl = optionalStr(formData, "posterUrl");

    if (url && !/^https?:\/\/|^\//.test(url)) {
      return {
        error: "La URL debe empezar por http://, https:// o /",
        fieldErrors: { url: ["Formato de URL no válido."] },
      };
    }

    await prisma.mediaSlot.update({
      where: { key },
      data: { url, posterUrl },
    });

    // "layout" y no la ruta sola: los espacios de medios los pinta media
    // página del sitio (/productos, /servicios, /nosotras, /sucursales),
    // y todas esas son estáticas. Revalidar solo "/" dejaba la imagen vieja en
    // el resto.
    revalidatePath("/", "layout");
    revalidatePath("/admin/medios");

    return { ok: true, message: url ? "Material cargado." : "Espacio vaciado." };
  });
}

export async function clearMediaSlot(formData: FormData) {
  await requireUserForAction(canManageContent);

  const key = str(formData, "key");
  if (!key) return;

  await prisma.mediaSlot.update({
    where: { key },
    data: { url: null, posterUrl: null },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/medios");
}
