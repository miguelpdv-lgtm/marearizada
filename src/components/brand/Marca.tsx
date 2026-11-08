import type { SVGProps } from "react";

/**
 * La marca de Marea Rizada: el sol de arena con la ola rizada y las
 * gaviotas, y el nombre rotulado. Isotipo PROVISIONAL reconstruido desde el
 * letrero del salón: se reemplaza por el vector oficial cuando llegue (o se
 * sube el archivo desde Configuración → Marca, que manda sobre este).
 */

type Props = SVGProps<SVGSVGElement> & { className?: string };

const ARENA = "#CDAA9C";
const ESPUMA = "#9EE5E7";
const ESPUMA_CLARA = "#BDEEEF";
const BLANCO = "#FFFFFF";

/** Colores de cada línea de la marca: el salón y Nails (marea invertida en arena). */
const VARIANTES = {
  salon: { arena: ARENA, agua: ESPUMA, aguaClara: ESPUMA_CLARA },
  nails: { arena: "#F3E3DC", agua: "#CDAA9C", aguaClara: "#E6CCC1" },
} as const;

/** El círculo del logo. Va siempre a todo color: no hereda `currentColor`. */
export function Isotipo({
  className = "h-10 w-auto",
  variante = "salon",
  ...props
}: Props & { variante?: keyof typeof VARIANTES }) {
  const c = VARIANTES[variante];
  const clip = `marea-isotipo-${variante}`;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Marea Rizada" {...props}>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={c.arena} />
        <path
          d="M57 26q2.8-2.8 5.6 0q2.8-2.8 5.6 0M69 18q2-2 4 0q2-2 4 0"
          fill="none"
          stroke={BLANCO}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M0 66C12 60 22 58 34 62S56 58 70 56 92 60 100 60V100H0Z" fill={c.aguaClara} />
        <path d="M0 60C10 58 18 50 30 50S43 61 52 61 63 48 73 48 88 58 100 57V100H0Z" fill={c.agua} />
        <g fill="none" stroke={BLANCO} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 60C10 58 18 50 30 50" />
          <path d="M30 50A8 8 0 0 0 22 58A7 7 0 0 0 29 65A5.5 5.5 0 0 0 34.5 59.5A3.8 3.8 0 0 0 30.7 55.7A2.4 2.4 0 0 0 28.3 58.1" />
          <path d="M37 53C41 58 45 61 52 61S63 48 73 48" />
          <path d="M73 48A8 8 0 0 0 65 56A7 7 0 0 0 72 63A5.5 5.5 0 0 0 77.5 57.5A3.8 3.8 0 0 0 73.7 53.7A2.4 2.4 0 0 0 71.3 56.1" />
          <path d="M80 50.5C86 53 92 57 100 57" />
          <path d="M4 79C12 74 18 74 25 78S38 83 46 78 58 73 66 78 79 83 87 78 97 74 100 75" strokeWidth="2.3" opacity=".9" />
        </g>
      </g>
    </svg>
  );
}

/** El nombre en dos líneas, en la tipografía rotulada. Hereda el color. */
export function Logotipo({ className = "h-6 w-auto", ...props }: Props) {
  return (
    <svg viewBox="0 0 150 60" className={className} role="img" aria-label="Marea Rizada" {...props}>
      <text x="0" y="24" fill="currentColor" fontFamily="var(--font-display)" fontWeight="500" fontSize="22" letterSpacing="2">
        MaReA
      </text>
      <text x="0" y="56" fill="currentColor" fontFamily="var(--font-display)" fontWeight="800" fontSize="32" letterSpacing="1">
        RiZADA
      </text>
    </svg>
  );
}

/** Isotipo + nombre, en horizontal. */
export function LogoPrincipal({ className = "h-16 w-auto", ...props }: Props) {
  return (
    <svg viewBox="0 0 230 80" className={className} role="img" aria-label="Marea Rizada" {...props}>
      <svg x="0" y="0" width="80" height="80" viewBox="0 0 100 100">
        <defs>
          <clipPath id="marea-principal">
            <circle cx="50" cy="50" r="47" />
          </clipPath>
        </defs>
        <g clipPath="url(#marea-principal)">
          <rect width="100" height="100" fill={ARENA} />
          <path d="M57 26q2.8-2.8 5.6 0q2.8-2.8 5.6 0M69 18q2-2 4 0q2-2 4 0" fill="none" stroke={BLANCO} strokeWidth="2" strokeLinecap="round" />
          <path d="M0 66C12 60 22 58 34 62S56 58 70 56 92 60 100 60V100H0Z" fill={ESPUMA_CLARA} />
          <path d="M0 60C10 58 18 50 30 50S43 61 52 61 63 48 73 48 88 58 100 57V100H0Z" fill={ESPUMA} />
          <g fill="none" stroke={BLANCO} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 50A8 8 0 0 0 22 58A7 7 0 0 0 29 65A5.5 5.5 0 0 0 34.5 59.5A3.8 3.8 0 0 0 30.7 55.7A2.4 2.4 0 0 0 28.3 58.1" />
            <path d="M73 48A8 8 0 0 0 65 56A7 7 0 0 0 72 63A5.5 5.5 0 0 0 77.5 57.5A3.8 3.8 0 0 0 73.7 53.7A2.4 2.4 0 0 0 71.3 56.1" />
            <path d="M4 79C12 74 18 74 25 78S38 83 46 78 58 73 66 78 79 83 87 78 97 74 100 75" strokeWidth="2.3" />
          </g>
        </g>
      </svg>
      <text x="94" y="34" fill="currentColor" fontFamily="var(--font-display)" fontWeight="500" fontSize="24" letterSpacing="2">
        MaReA
      </text>
      <text x="92" y="70" fill="currentColor" fontFamily="var(--font-display)" fontWeight="800" fontSize="34" letterSpacing="1">
        RiZADA
      </text>
    </svg>
  );
}
