import type { MetadataRoute } from "next";

import { urlSitio } from "@/lib/site";

/**
 * Mapa del sitio. Marea Rizada tiene pocas páginas públicas, así que la lista
 * es fija. Todo `/admin` y las pantallas de abono y cambio de cita quedan
 * fuera a propósito — ver `robots.ts`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlSitio();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/reservar`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/legal/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
