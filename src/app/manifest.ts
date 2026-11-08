import type { MetadataRoute } from "next";

/**
 * Manifiesto para "Agregar a la pantalla de inicio" en Android y para que el
 * navegador pinte su barra con el amarillo de la marca. Los íconos son el
 * isotipo vino sobre amarillo (versión ISOTIPO del manual), con aire alrededor
 * para que Android pueda recortarlos en círculo sin cortar las puntas.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amicrespa · Salón de cabello rizado",
    short_name: "Amicrespa",
    description:
      "Salón especializado en cabello crespo, rizado y ondulado en Barranquilla y Cali.",
    start_url: "/",
    display: "browser",
    background_color: "#f1eee2",
    theme_color: "#f5ec85",
    lang: "es-CO",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
