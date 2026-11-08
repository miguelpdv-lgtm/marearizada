import { z } from "zod";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = {};

/** Traduce un ZodError al formato que consumen los formularios del panel. */
export function zodToState(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return {
    error: "Revisa los campos marcados.",
    fieldErrors,
  };
}

/** Envuelve una server action para que nunca reviente la UI. */
export async function runAction(
  fn: () => Promise<ActionState>,
): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof z.ZodError) return zodToState(err);

    // next/navigation lanza este error para redirigir: hay que dejarlo pasar.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof err.digest === "string" &&
      err.digest.startsWith("NEXT_")
    ) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : "Ocurrió un error inesperado.";
    return { error: message };
  }
}

// --- Utilidades para leer FormData ------------------------------------------

export function str(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalStr(form: FormData, key: string) {
  const value = str(form, key);
  return value === "" ? null : value;
}

export function int(form: FormData, key: string, fallback = 0) {
  const raw = str(form, key).replace(/[^\d-]/g, "");
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function optionalInt(form: FormData, key: string) {
  const raw = str(form, key).replace(/[^\d-]/g, "");
  if (raw === "") return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

/**
 * Lista de URLs que manda un `GalleryField` (JSON en un campo oculto).
 * `undefined` si el formulario no trae el campo: así un formulario viejo no
 * vacía la galería sin querer.
 */
export function urlList(form: FormData, key: string): string[] | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string") return undefined;
  try {
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return undefined;
    return lista.filter((u): u is string => typeof u === "string" && /^(https?:\/\/|\/)/.test(u)).slice(0, 20);
  } catch {
    return undefined;
  }
}

export function bool(form: FormData, key: string) {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}
