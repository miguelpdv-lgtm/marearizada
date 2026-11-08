import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Storage — subida de imágenes y videos del panel.
 *
 * El archivo NO pasa por el servidor de Next: este módulo solo firma un
 * permiso de subida de un solo uso y el navegador sube directo a Supabase.
 * Así se evita el límite de tamaño de las server actions (4.5 MB en Vercel)
 * y la clave de servicio nunca sale del servidor.
 */

export const BUCKET = "media";

/** Debe coincidir con allowed_mime_types del bucket. */
export const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** Debe coincidir con file_size_limit del bucket. */
export const TAMANO_MAXIMO = 50 * 1024 * 1024;

/** Carpetas válidas dentro del bucket, para mantenerlo ordenado. */
export const CARPETAS = [
  "servicios",
  "productos",
  "equipo",
  "historias",
  "sucursales",
  "blog",
  "galeria",
  "medios",
  "marca",
] as const;

export type Carpeta = (typeof CARPETAS)[number];

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** ¿Está configurado Storage? Sirve para no mostrar el subidor si no lo está. */
export function storageConfigurado() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Convierte "Foto del Salón (1).JPG" en "foto-del-salon-1.jpg". */
export function nombreSeguro(nombre: string) {
  const punto = nombre.lastIndexOf(".");
  const base = punto > 0 ? nombre.slice(0, punto) : nombre;
  const ext = punto > 0 ? nombre.slice(punto + 1).toLowerCase() : "bin";

  const limpio = base
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const sufijo = Math.random().toString(36).slice(2, 8);
  return `${limpio || "archivo"}-${Date.now().toString(36)}-${sufijo}.${ext.replace(/[^a-z0-9]/g, "")}`;
}

/**
 * Firma un permiso de subida para una ruta concreta.
 * El token vale para un solo archivo y caduca solo.
 */
export async function firmarSubida(carpeta: Carpeta, nombreArchivo: string) {
  const ruta = `${carpeta}/${nombreSeguro(nombreArchivo)}`;

  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUploadUrl(ruta);

  if (error || !data) {
    throw new Error(`No se pudo preparar la subida: ${error?.message}`);
  }

  const { data: publica } = admin().storage.from(BUCKET).getPublicUrl(ruta);

  // signedUrl ya trae el token: el navegador solo tiene que hacer PUT ahí.
  return {
    ruta,
    signedUrl: data.signedUrl,
    urlPublica: publica.publicUrl,
  };
}

/** Borra un archivo del bucket a partir de su URL pública. */
export async function borrarPorUrl(url: string) {
  const marca = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i === -1) return false; // No es nuestro: no lo tocamos.

  const ruta = decodeURIComponent(url.slice(i + marca.length));
  const { error } = await admin().storage.from(BUCKET).remove([ruta]);
  return !error;
}
