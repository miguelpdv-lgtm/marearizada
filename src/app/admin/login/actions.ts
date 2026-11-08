"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { runAction, str, type ActionState } from "@/lib/actions";
import {
  consumir,
  esperaLegible,
  ipDeLaPeticion,
  perdonar,
} from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const parsed = schema.safeParse({
      email: str(formData, "email").toLowerCase(),
      password: str(formData, "password"),
    });

    if (!parsed.success) {
      return {
        error: "Revisa los campos marcados.",
        fieldErrors: parsed.error.issues.reduce<Record<string, string[]>>(
          (acc, issue) => {
            const key = issue.path.join(".");
            (acc[key] ??= []).push(issue.message);
            return acc;
          },
          {},
        ),
      };
    }

    // Freno de fuerza bruta. Se cuenta por correo (para que no machaquen una
    // cuenta) y por IP (para que no barran la lista de correos). Va antes de
    // tocar la base: un intento bloqueado no debería ni costar una consulta de
    // usuario ni un bcrypt, que es lo caro.
    const ip = await ipDeLaPeticion();
    for (const [accion, llave] of [
      ["login", parsed.data.email],
      ["login-ip", ip],
    ] as const) {
      const permiso = await consumir(accion, llave);
      if (!permiso.ok) {
        return {
          error: `Demasiados intentos. Vuelve a intentarlo en ${esperaLegible(permiso.segundos)}.`,
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    // Mismo mensaje para usuario inexistente y contraseña incorrecta,
    // para no revelar qué correos están registrados.
    const invalid = { error: "Correo o contraseña incorrectos." };

    if (!user) return invalid;

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) return invalid;

    // Entró bien: se le devuelve el crédito para que usar el panel todos los
    // días nunca acerque al bloqueo.
    await perdonar("login", parsed.data.email);
    await perdonar("login-ip", ip);

    if (!user.active) {
      return {
        error: "Tu usuario está desactivado. Contacta a un administrador.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession(user.id);

    const next = str(formData, "next");
    redirect(next.startsWith("/admin") ? next : "/admin");
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
