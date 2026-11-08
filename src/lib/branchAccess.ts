import "server-only";

import type { SessionUser } from "@/lib/auth";

/**
 * Sedes que un usuario puede ver/operar en el panel. ADMIN siempre tiene
 * acceso a todas, sin importar lo que tenga asignado — el resto (EDITOR,
 * STAFF) solo a las que se le hayan marcado en su ficha de usuario.
 */
export function sedesPermitidas<T extends { id: string }>(
  user: SessionUser,
  sedes: T[],
): T[] {
  if (user.role === "ADMIN") return sedes;
  return sedes.filter((s) => user.branchIds.includes(s.id));
}

/**
 * Resuelve el filtro de sede efectivo de una página con selector `?sede=`:
 * si el usuario solo tiene una sede permitida, se ignora el query param y se
 * fuerza esa (no debe poder ver la otra cambiando la URL a mano). Si tiene
 * varias, se respeta el query param mientras esté dentro de lo permitido —
 * de lo contrario cae a "todas las permitidas" (equivalente a "Ambas").
 */
export function sedeEfectiva(permitidas: { id: string }[], sedeQuery?: string) {
  if (permitidas.length === 1) return permitidas[0].id;
  if (sedeQuery && permitidas.some((s) => s.id === sedeQuery)) return sedeQuery;
  return undefined;
}
