import { readFileSync, writeFileSync } from "node:fs";

/**
 * Convierte los SVG vectorizados en componentes React.
 *
 * El vectorizado dejó cada trazo partido en decenas de tonos distintos
 * (los bordes suavizados se convirtieron en paths con su propio color).
 * Aquí todo pasa a `currentColor`: el color lo pone la página según el
 * manual, y de paso desaparecen los tonos sucios.
 */

const FUENTE = process.argv[2] ?? "D:/Downloads";

// Manchas de la vectorización: quedaron fuera del dibujo o en casi blanco.
const BASURA = new Set([
  "#fbf7f5",
  "#f9f5f1",
  "#fefefe",
  "#efdfd3",
  "#dfbea5",
]);

function extraer(archivo, { descartarFueraDe } = {}) {
  const svg = readFileSync(`${FUENTE}/${archivo}`, "utf8");

  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const paths = [...svg.matchAll(/<path\s+([^>]*?)\/>/g)].map((m) => m[1]);

  const limpios = [];
  let descartados = 0;

  for (const attrs of paths) {
    const fill = (attrs.match(/fill="([^"]+)"/)?.[1] ?? "").toLowerCase();
    const transform = attrs.match(/transform="([^"]+)"/)?.[1] ?? "";
    const d = attrs.match(/d="([^"]+)"/)?.[1] ?? "";

    if (!d.trim()) {
      descartados++;
      continue;
    }
    if (BASURA.has(fill)) {
      descartados++;
      continue;
    }

    // Motas sueltas muy por encima del dibujo real
    if (descartarFueraDe) {
      const y = Number(transform.match(/translate\([\d.]+[ ,]([\d.e]+)\)/)?.[1]);
      if (Number.isFinite(y) && y < descartarFueraDe && d.length < 60) {
        descartados++;
        continue;
      }
    }

    limpios.push({ transform, d });
  }

  return { viewBox, paths: limpios, descartados, total: paths.length };
}

// Los originales traen mucho aire alrededor. Estas cajas son el contorno
// real del dibujo, medido con getBBox en el navegador, más 4 de margen.
const CAJAS = {
  principal: "120 288 1752 711",
  isotipo: "287 550 1494 638",
  logotipo: "257 706 1558 199",
};

const piezas = {
  principal: extraer("principal.svg", { descartarFueraDe: 250 }),
  isotipo: extraer("isotipo.svg", { descartarFueraDe: 500 }),
  logotipo: extraer("logotipo.svg", { descartarFueraDe: 600 }),
};

for (const [nombre, caja] of Object.entries(CAJAS)) piezas[nombre].viewBox = caja;

for (const [nombre, p] of Object.entries(piezas)) {
  console.log(
    `${nombre.padEnd(10)} viewBox=${p.viewBox.padEnd(14)} ${p.paths.length}/${p.total} paths (${p.descartados} descartados)`,
  );
}

const jsxPaths = (paths) =>
  paths
    .map(
      ({ transform, d }) =>
        `      <path${transform ? ` transform="${transform}"` : ""} d="${d}" />`,
    )
    .join("\n");

const salida = `import type { SVGProps } from "react";

/**
 * Los tres bloqueos del manual de marca, vectorizados desde los originales.
 *
 * El vectorizado repartía cada trazo en decenas de tonos (#833C0F, #B26326,
 * #E8B274…): eran los bordes suavizados convertidos en paths sueltos. Todos
 * heredan ahora \`currentColor\`, así que el color lo decide la página y las
 * combinaciones del manual salen limpias:
 *
 * · PRINCIPAL — amarillo sobre vino
 * · LOGOTIPO  — vino sobre rosa
 * · ISOTIPO   — vino sobre amarillo
 */

type Props = SVGProps<SVGSVGElement> & { className?: string };

/** Bloqueo completo: isotipo sobre la palabra. */
export function LogoPrincipal({ className = "h-16 w-auto", ...props }: Props) {
  return (
    <svg
      viewBox="${piezas.principal.viewBox}"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Amicrespa"
      {...props}
    >
${jsxPaths(piezas.principal.paths)}
    </svg>
  );
}

/** Solo la marca: la "M" de mechones. */
export function Isotipo({ className = "h-10 w-auto", ...props }: Props) {
  return (
    <svg
      viewBox="${piezas.isotipo.viewBox}"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
${jsxPaths(piezas.isotipo.paths)}
    </svg>
  );
}

/** Solo la palabra. */
export function Logotipo({ className = "h-6 w-auto", ...props }: Props) {
  return (
    <svg
      viewBox="${piezas.logotipo.viewBox}"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Amicrespa"
      {...props}
    >
${jsxPaths(piezas.logotipo.paths)}
    </svg>
  );
}
`;

writeFileSync("D:/Proyectos/Amicrespa/src/components/brand/Marca.tsx", salida, "utf8");
console.log("\n→ src/components/brand/Marca.tsx");

/* --- Favicon -------------------------------------------------------------
   Combinación ISOTIPO del manual: la marca en vino sobre amarillo.
   A 64 px las motas del vectorizado no se ven, así que solo van los
   trazos grandes: el archivo baja de ~40 KB a menos de 4 KB. */

const [vx, vy, vw, vh] = CAJAS.isotipo.split(" ").map(Number);
// Hay un corte limpio: 13 trazos reales por encima de 150, y de ahí para
// abajo solo motas del suavizado.
const gruesos = piezas.isotipo.paths.filter((p) => p.d.length > 150);

const ancho = 52;
const escala = ancho / vw;
const alto = vh * escala;
const tx = (64 - ancho) / 2 - vx * escala;
const ty = (64 - alto) / 2 - vy * escala;

const favicon = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="12" fill="#F5EC85"/>
  <g fill="#5B001D" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${escala.toFixed(5)})">
${gruesos.map(({ transform, d }) => `    <path${transform ? ` transform="${transform}"` : ""} d="${d}"/>`).join("\n")}
  </g>
</svg>
`;

writeFileSync("D:/Proyectos/Amicrespa/src/app/icon.svg", favicon, "utf8");
console.log(`→ src/app/icon.svg (${gruesos.length} trazos, ${(favicon.length / 1024).toFixed(1)} KB)`);
