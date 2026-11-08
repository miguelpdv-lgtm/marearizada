import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "marea_session";
const SESSION_DAYS = 7;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). Revisa tu archivo .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  /** Sedes asignadas. Vacío para ADMIN (no importa: siempre ve todas — ver
   * `sedesPermitidas()` en @/lib/branchAccess). */
  branchIds: string[];
};

/**
 * Lee la sesión y confirma contra la base de datos que el usuario sigue activo.
 * Cacheado por request para no repetir la consulta en cada layout/página.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      active: true,
      branches: { select: { id: true } },
    },
  });

  if (!user || !user.active) return null;

  const { active: _active, branches, ...rest } = user;
  void _active;
  return { ...rest, branchIds: branches.map((b) => b.id) };
});

/** Para usar en layouts y páginas del panel. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Para usar dentro de server actions: lanza en vez de redirigir. */
export async function requireUserForAction(
  check?: (role: string) => boolean,
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (check && !check(user.role)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
  return user;
}
