import Image from "next/image";

import { Isotipo, LogoPrincipal, Logotipo } from "@/components/brand/Marca";

export { Isotipo, LogoPrincipal, Logotipo };

/**
 * Nombre anterior del isotipo. Se mantiene para no romper el panel,
 * pero ahora dibuja la marca real del manual.
 */
export const CurlMark = Isotipo;

/**
 * Bloqueo principal del manual: la "M" sobre la palabra.
 *
 * Hereda el color con `currentColor`, así que las tres combinaciones del
 * brandbook salen cambiando una clase:
 * · `text-gold-500` sobre vino   — PRINCIPAL
 * · `text-ink` sobre rosa        — LOGOTIPO
 * · `text-ink` sobre amarillo    — ISOTIPO
 *
 * Si suben el archivo oficial desde el panel, ese manda.
 */
export function Logo({
  variant = "dark",
  className = "",
  markClassName = "h-12 w-auto",
  src,
}: {
  /** "dark" = vino sobre fondo claro · "light" = amarillo sobre fondo oscuro */
  variant?: "dark" | "light";
  className?: string;
  markClassName?: string;
  /** URL del logo oficial cargado desde el panel. */
  src?: string | null;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt="Amicrespa"
        width={220}
        height={140}
        className={`h-auto w-auto object-contain ${markClassName} ${className}`}
        priority
      />
    );
  }

  const color = variant === "light" ? "text-gold-500" : "text-ink";

  return <LogoPrincipal className={`${markClassName} ${color} ${className}`} />;
}
