/**
 * Colores de las gráficas de dona. Van en un archivo aparte (sin "use client")
 * para que las páginas del servidor puedan leerlos.
 *
 * Colores del sistema de diseño (marea, arcilla, espuma y concha; gris para lo
 * que no tiene dato). Los nombres vienen de la paleta anterior y se conservan.
 */
export const COLORES_DONA = {
  azul: "#1c6f75",
  naranja: "#9a5b49",
  aguamarina: "#6fcfd3",
  ciruela: "#cdaa9c",
  gris: "#b9c4c2",
} as const;
