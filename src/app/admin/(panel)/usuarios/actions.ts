"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hashPassword, requireUserForAction } from "@/lib/auth";
import { ROLES, canManageUsers } from "@/lib/constants";
import {
  bool,
  optionalStr,
  runAction,
  str,
  zodToState,
  type ActionState,
} from "@/lib/actions";

const baseSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio."),
  email: z.string().email("Escribe un correo válido."),
  role: z.enum(ROLES, { message: "Selecciona un rol válido." }),
});

/** ADMIN siempre ve ambas sedes sin importar la asignación — para el resto,
 * hay que elegir al menos una. */
function leerSedes(formData: FormData, role: string): ActionState | string[] {
  const ids = formData.getAll("branchIds").map(String);
  if (role !== "ADMIN" && ids.length === 0) {
    return {
      error: "Revisa los campos marcados.",
      fieldErrors: { branchIds: ["Elige al menos un local."] },
    };
  }
  return role === "ADMIN" ? [] : ids;
}

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.");

function revalidateUsers() {
  revalidatePath("/admin/usuarios");
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageUsers);

    const data = {
      name: str(formData, "name"),
      email: str(formData, "email").toLowerCase(),
      role: str(formData, "role"),
    };

    const parsed = baseSchema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const password = str(formData, "password");
    const passwordParsed = passwordSchema.safeParse(password);
    if (!passwordParsed.success) {
      return {
        error: "Revisa los campos marcados.",
        fieldErrors: {
          password: passwordParsed.error.issues.map((i) => i.message),
        },
      };
    }

    if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
      return {
        error: "Ese correo ya está registrado.",
        fieldErrors: { email: ["Usa otro correo."] },
      };
    }

    const sedes = leerSedes(formData, parsed.data.role);
    if (!Array.isArray(sedes)) return sedes;

    await prisma.user.create({
      data: {
        ...parsed.data,
        passwordHash: await hashPassword(password),
        phone: optionalStr(formData, "phone"),
        avatarUrl: optionalStr(formData, "avatarUrl"),
        branches: { connect: sedes.map((id) => ({ id })) },
        active: bool(formData, "active"),
      },
    });

    revalidateUsers();
    redirect("/admin/usuarios?ok=creado");
  });
}

export async function updateUser(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const currentUser = await requireUserForAction(canManageUsers);

    const data = {
      name: str(formData, "name"),
      email: str(formData, "email").toLowerCase(),
      role: str(formData, "role"),
    };

    const parsed = baseSchema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const emailClash = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id } },
      select: { id: true },
    });
    if (emailClash) {
      return {
        error: "Ese correo ya está registrado por otro usuario.",
        fieldErrors: { email: ["Usa otro correo."] },
      };
    }

    const active = bool(formData, "active");

    // Nadie puede quitarse a sí mismo el acceso y quedar fuera del panel.
    if (currentUser.id === id) {
      if (!active) {
        return { error: "No puedes desactivar tu propio usuario." };
      }
      if (parsed.data.role !== "ADMIN") {
        return { error: "No puedes quitarte a ti misma el rol de administrador." };
      }
    }

    // Siempre debe quedar al menos un administrador activo.
    if (parsed.data.role !== "ADMIN" || !active) {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true, NOT: { id } },
      });
      if (otherAdmins === 0) {
        return {
          error:
            "Debe existir al menos un administrador activo. Asigna el rol a otra persona antes de cambiar este usuario.",
        };
      }
    }

    const password = str(formData, "password");
    let passwordHash: string | undefined;

    if (password) {
      const passwordParsed = passwordSchema.safeParse(password);
      if (!passwordParsed.success) {
        return {
          error: "Revisa los campos marcados.",
          fieldErrors: {
            password: passwordParsed.error.issues.map((i) => i.message),
          },
        };
      }
      passwordHash = await hashPassword(password);
    }

    const sedes = leerSedes(formData, parsed.data.role);
    if (!Array.isArray(sedes)) return sedes;

    await prisma.user.update({
      where: { id },
      data: {
        ...parsed.data,
        phone: optionalStr(formData, "phone"),
        avatarUrl: optionalStr(formData, "avatarUrl"),
        branches: { set: sedes.map((sedeId) => ({ id: sedeId })) },
        active,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    revalidateUsers();
    return {
      ok: true,
      message: passwordHash
        ? "Usuario actualizado y contraseña restablecida."
        : "Usuario actualizado.",
    };
  });
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireUserForAction(canManageUsers);

  const id = str(formData, "id");
  if (!id) return;

  if (id === currentUser.id) {
    throw new Error("No puedes eliminar tu propio usuario.");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });

  if (target?.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, NOT: { id } },
    });
    if (otherAdmins === 0) {
      throw new Error("Debe existir al menos un administrador activo.");
    }
  }

  await prisma.user.delete({ where: { id } });
  revalidateUsers();
  redirect("/admin/usuarios?ok=eliminado");
}
