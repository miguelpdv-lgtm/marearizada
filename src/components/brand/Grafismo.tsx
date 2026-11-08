import { GRAFISMOS } from "./grafismos-datos";

export type VarianteGrafismo = keyof typeof GRAFISMOS;

/**
 * Una lámina de grafismo del manual (capítulo 04), con los vectores
 * originales del PDF. Se usa como el manual la usa: una superficie completa
 * de color con las ondas encima, nunca como franja fina ni como adorno
 * suelto.
 *
 * · `diagonal` — la lámina de ondas diagonales (rosa sobre terracota).
 * · `vertical` — ondas verticales (terracota sobre rosa).
 * · `bandas`   — dos bandas horizontales (vino sobre terracota).
 *
 * `fondo` y `trazo` aceptan cualquier color CSS, así que la misma lámina
 * sirve en las combinaciones del manual o tono sobre tono.
 */
export function Grafismo({
  variante,
  fondo,
  trazo,
  className = "",
}: {
  variante: VarianteGrafismo;
  fondo: string;
  trazo: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
      style={{ backgroundColor: fondo }}
    >
      {GRAFISMOS[variante].map((d, i) => (
        <path key={i} d={d} style={{ fill: trazo }} />
      ))}
    </svg>
  );
}
