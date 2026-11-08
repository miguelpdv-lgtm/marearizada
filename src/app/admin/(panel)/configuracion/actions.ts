"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageSettings } from "@/lib/constants";
import { runAction, type ActionState } from "@/lib/actions";

/**
 * Guarda un grupo de ajustes. Solo se actualizan las claves que vienen
 * en el formulario, que son las del grupo que se está editando.
 */
export async function updateSettings(
  group: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageSettings);

    const settings = await prisma.setting.findMany({
      where: { group },
      select: { key: true, type: true },
    });

    for (const setting of settings) {
      const raw = formData.get(setting.key);

      // Los interruptores no envían nada cuando están apagados.
      const value =
        setting.type === "BOOLEAN"
          ? raw === "on" || raw === "true"
            ? "true"
            : "false"
          : typeof raw === "string"
            ? raw.trim()
            : "";

      await prisma.setting.update({
        where: { key: setting.key },
        data: { value },
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracion");

    return { ok: true, message: "Configuración guardada." };
  });
}
