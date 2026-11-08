import type { MetadataRoute } from "next";

/** Manifiesto para "Agregar a la pantalla de inicio" y el color de la barra. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marea Rizada · Expertos en salud capilar",
    short_name: "Marea Rizada",
    description: "Salón especializado en salud capilar y rizos.",
    start_url: "/",
    display: "browser",
    background_color: "#f2f8f7",
    theme_color: "#0f3236",
    lang: "es-CO",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
