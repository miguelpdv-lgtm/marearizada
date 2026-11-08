/**
 * Colores de las gráficas de dona. Van en un archivo aparte (sin "use client")
 * para que las páginas del servidor puedan leerlos.
 *
 * Paleta validada para daltonismo con todos los pares (en una dona todas las
 * tajadas se tocan): azul, naranja, aguamarina y ciruela; gris para lo que no
 * tiene dato.
 */
export const COLORES_DONA = {
  azul: "#2a78d6",
  naranja: "#eb6834",
  aguamarina: "#1baf7a",
  ciruela: "#9b3d8f",
  gris: "#a8a29e",
} as const;
