import type { MetadataRoute } from "next";

import { urlSitio } from "@/lib/site";

/**
 * Qué puede rastrear un buscador.
 *
 * Fuera quedan tres cosas y cada una por su razón:
 *   · `/admin` — el panel. No tiene nada que indexar y sí una puerta de login.
 *   · `/api` — endpoints, no páginas.
 *   · `/reservar/pago` y `/reservar/cambiar` — el código de la cita y su
 *     token van en la URL. Indexarlas sería publicar la cita de una clienta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/reservar/pago/", "/reservar/cambiar"],
    },
    sitemap: `${urlSitio()}/sitemap.xml`,
    host: urlSitio(),
  };
}
