"use server";

import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import {
  CARPETAS,
  TAMANO_MAXIMO,
  TIPOS_PERMITIDOS,
  type Carpeta,
  borrarPorUrl,
  firmarSubida,
} from "@/lib/storage";

export type PermisoSubida =
  | { ok: true; ruta: string; signedUrl: string; urlPublica: string }
  | { ok: false; error: string };

/**
 * Firma un permiso de subida para el navegador.
 *
 * Aquí se valida todo lo que importa: que haya sesión con permisos, que la
 * carpeta sea una de las nuestras y que el archivo cumpla tipo y tamaño.
 * El bucket vuelve a comprobar tipo y tamaño por su cuenta, así que un cliente
 * manipulado no puede saltarse los límites.
 */
export async function pedirPermisoDeSubida(
  carpeta: string,
  nombreArchivo: string,
  tipo: string,
  tamano: number,
): Promise<PermisoSubida> {
  try {
    await requireUserForAction(canManageContent);

    if (!CARPETAS.includes(carpeta as Carpeta)) {
      return { ok: false, error: "Carpeta no válida." };
    }

    if (!TIPOS_PERMITIDOS.includes(tipo as (typeof TIPOS_PERMITIDOS)[number])) {
      return {
        ok: false,
        error: "Formato no admitido. Usa JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM o MOV.",
      };
    }

    if (!Number.isFinite(tamano) || tamano <= 0) {
      return { ok: false, error: "El archivo está vacío." };
    }

    if (tamano > TAMANO_MAXIMO) {
      const mb = (tamano / 1024 / 1024).toFixed(1);
      return {
        ok: false,
        error: `El archivo pesa ${mb} MB y el máximo son 50 MB. Comprímelo antes de subirlo.`,
      };
    }

    const { ruta, signedUrl, urlPublica } = await firmarSubida(
      carpeta as Carpeta,
      nombreArchivo,
    );

    return { ok: true, ruta, signedUrl, urlPublica };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Borra un archivo del bucket. Ignora las URLs externas. */
export async function borrarArchivo(url: string) {
  try {
    await requireUserForAction(canManageContent);
    return { ok: await borrarPorUrl(url) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
