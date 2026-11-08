"use client";

import { useEffect, useRef } from "react";

/**
 * Manchas de color: formas orgánicas planas en los colores del manual que
 * se asoman por los bordes de las secciones y respiran despacio.
 *
 * Cada mancha es un contorno cerrado de 7 puntos cuyo radio oscila con
 * senos de fase y velocidad propias (derivadas de `semilla`), suavizado con
 * Catmull-Rom. El primer cuadro se calcula igual en el servidor y en el
 * navegador (t = 0), así que no hay salto al hidratar; después solo se
 * anima mientras la sección está en pantalla y nunca con
 * `prefers-reduced-motion`.
 *
 * Reglas de uso (docs/DESIGN_SYSTEM.md): detrás de texto van solo los
 * tonos claros (`-pale`, `gold-100`), donde el vino y la terracota siguen
 * pasando 4.5:1. Los tonos saturados van en las orillas, lejos del texto.
 */

export type Mancha = {
  /** Color CSS, normalmente un token: "var(--color-pink)". */
  color: string;
  /** Centro de la mancha, relativo a la sección ("12%", "-4rem"…). */
  x: string;
  y: string;
  /** Ancho de la mancha ("28rem", "40vw"…). */
  size: string;
  /** Cambia la forma; dos manchas con la misma semilla son iguales. */
  semilla: number;
  /** Giro base en grados. */
  giro?: number;
  /** Oculta la mancha por debajo de `md` para no tapar el contenido en móvil. */
  soloEscritorio?: boolean;
};

const PUNTOS = 7;
const RADIO = 70;

/** Pseudoaleatorio determinista: mismo resultado en servidor y navegador. */
function azar(semilla: number, i: number) {
  const x = Math.sin(semilla * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function parametros(semilla: number) {
  return Array.from({ length: PUNTOS }, (_, i) => ({
    base: 0.82 + azar(semilla, i) * 0.3,
    amp: 0.05 + azar(semilla, i + 20) * 0.07,
    vel: 0.00018 + azar(semilla, i + 40) * 0.00022,
    fase: azar(semilla, i + 60) * Math.PI * 2,
  }));
}

function contorno(params: ReturnType<typeof parametros>, t: number) {
  const pts = params.map((p, i) => {
    const ang = (i / PUNTOS) * Math.PI * 2;
    const r = RADIO * (p.base + p.amp * Math.sin(t * p.vel + p.fase));
    return [100 + Math.cos(ang) * r, 100 + Math.sin(ang) * r];
  });

  // Catmull-Rom cerrado → curvas cúbicas.
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < PUNTOS; i++) {
    const p0 = pts[(i - 1 + PUNTOS) % PUNTOS];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % PUNTOS];
    const p3 = pts[(i + 2) % PUNTOS];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

export function Manchas({
  manchas,
  className = "",
  recortar = true,
}: {
  manchas: Mancha[];
  className?: string;
  /** `false` deja que las manchas se salgan de la caja (ver `Costura`). */
  recortar?: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const trazos = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const todos = manchas.map((m) => parametros(m.semilla));
    let cuadro = 0;
    let visible = false;
    const inicio = performance.now();

    const pintar = (ahora: number) => {
      const t = ahora - inicio;
      todos.forEach((p, i) => trazos.current[i]?.setAttribute("d", contorno(p, t)));
      cuadro = visible ? requestAnimationFrame(pintar) : 0;
    };

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      if (visible && !cuadro) cuadro = requestAnimationFrame(pintar);
    });
    observador.observe(el);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, [manchas]);

  return (
    <div
      ref={contenedor}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${recortar ? "overflow-hidden" : ""} ${className}`}
    >
      {manchas.map((m, i) => (
        <svg
          key={i}
          viewBox="0 0 200 200"
          className={`absolute ${m.soloEscritorio ? "hidden md:block" : ""}`}
          style={{
            left: m.x,
            top: m.y,
            width: m.size,
            height: m.size,
            transform: `translate(-50%, -50%) rotate(${m.giro ?? 0}deg)`,
          }}
        >
          <path
            ref={(n) => {
              trazos.current[i] = n;
            }}
            d={contorno(parametros(m.semilla), 0)}
            style={{ fill: m.color }}
          />
        </svg>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composiciones listas por fondo                                             */
/* -------------------------------------------------------------------------- */

/**
 * Colores por fondo de sección, elegidos para que el texto de encima siga
 * leyéndose: a la izquierda (donde arrancan titulares y párrafos) solo van
 * amarillo, azul o terracota; el rosa, que no aguanta el texto secundario
 * ni la terracota, va del lado derecho. Los saturados siempre en la orilla.
 */
const PALETAS = {
  claro: { izq: "var(--color-gold-500)", der: "var(--color-pink)", chica: "var(--color-terra)", suave: "var(--color-sky)" },
  amarillo: { izq: "var(--color-sky)", der: "var(--color-pink)", chica: "var(--color-terra)", suave: "var(--color-pink-soft)" },
  azul: { izq: "var(--color-gold-500)", der: "var(--color-pink)", chica: "var(--color-terra)", suave: "var(--color-gold-200)" },
  terracota: { izq: "var(--color-gold-500)", der: "var(--color-pink)", chica: "var(--color-terra)", suave: "var(--color-sky)" },
  rosa: { izq: "var(--color-gold-500)", der: "var(--color-pink-soft)", chica: "var(--color-terra)", suave: "var(--color-sky)" },
  vino: { izq: "var(--color-terra)", der: "var(--color-pink)", chica: "var(--color-gold-500)", suave: "var(--color-terra)" },
} as const;

export type FondoSeccion = keyof typeof PALETAS;

/**
 * Manchas para una sección entera. Va como primer hijo de una sección con
 * la clase `con-manchas` (globals.css), que pone el resto del contenido por
 * encima. `variante` cambia la composición para que dos secciones seguidas
 * no se vean iguales.
 *
 * `bandas` reparte la composición a lo largo de secciones muy altas (un
 * catálogo de varias pantallas): la sección se divide en franjas y cada una
 * lleva su propia composición, alternando variantes. Sin esto, las cuatro
 * manchas quedan solo arriba y abajo y el medio se ve vacío.
 */
export function ManchasSeccion({
  sobre = "claro",
  variante = 0,
  semilla = 1,
  bandas = 1,
}: {
  sobre?: FondoSeccion;
  variante?: 0 | 1 | 2;
  semilla?: number;
  bandas?: number;
}) {
  if (bandas > 1) {
    const todas = Array.from({ length: bandas }, (_, k) =>
      composicion(sobre, ((variante + k) % 3) as 0 | 1 | 2, semilla + k * 7).map((m) => ({
        ...m,
        // La y de cada mancha se lleva a su franja: "28%" en la franja 2 de 4
        // queda en (1 + 0.28) / 4 del alto total.
        y: `${((k + parseFloat(m.y) / 100) / bandas) * 100}%`,
      })),
    ).flat();
    return <Manchas manchas={todas} className="manchas" />;
  }
  return <Manchas manchas={composicion(sobre, variante, semilla)} className="manchas" />;
}

function composicion(sobre: FondoSeccion, variante: 0 | 1 | 2, semilla: number): Mancha[] {
  const c = PALETAS[sobre];
  const s = semilla * 10;
  const composiciones: Mancha[][] = [
    [
      { color: c.izq, x: "-5%", y: "28%", size: "min(24rem, 62vw)", semilla: s + 1 },
      { color: c.der, x: "104%", y: "66%", size: "min(26rem, 66vw)", semilla: s + 2 },
      { color: c.chica, x: "96%", y: "14%", size: "7rem", semilla: s + 3, soloEscritorio: true },
      { color: c.suave, x: "-2%", y: "86%", size: "8rem", semilla: s + 4, soloEscritorio: true },
    ],
    [
      { color: c.izq, x: "-4%", y: "72%", size: "min(22rem, 58vw)", semilla: s + 5 },
      { color: c.der, x: "103%", y: "26%", size: "min(28rem, 70vw)", semilla: s + 6 },
      { color: c.chica, x: "-1%", y: "10%", size: "6rem", semilla: s + 7, soloEscritorio: true },
      { color: c.suave, x: "101%", y: "88%", size: "9rem", semilla: s + 8, soloEscritorio: true },
    ],
    [
      { color: c.izq, x: "-6%", y: "50%", size: "min(20rem, 55vw)", semilla: s + 9 },
      { color: c.der, x: "102%", y: "14%", size: "min(18rem, 50vw)", semilla: s + 10 },
      { color: c.suave, x: "104%", y: "82%", size: "min(20rem, 52vw)", semilla: s + 11 },
      { color: c.chica, x: "-1%", y: "12%", size: "5rem", semilla: s + 12, soloEscritorio: true },
    ],
  ];
  return composiciones[variante];
}

/**
 * Una mancha que cruza el borde entre dos secciones y las cose: la mitad
 * queda en la de arriba y la mitad en la de abajo. Va entre las dos
 * secciones en el marcado.
 *
 * Se pinta por encima de los fondos (z 1) y por debajo del contenido de las
 * secciones con `con-manchas` (z 2). Siempre sale por la orilla de la
 * página, donde las secciones solo tienen relleno o tarjetas, nunca texto
 * suelto.
 */
export function Costura({
  color,
  lado = "der",
  size = "16rem",
  semilla,
}: {
  color: string;
  lado?: "izq" | "der";
  size?: string;
  semilla: number;
}) {
  return (
    <div
      // Recorta solo a los lados (no arriba ni abajo): la mancha puede cruzar
      // el borde entre secciones sin ensanchar la página.
      className="pointer-events-none relative z-[1] h-0 [overflow-x:clip] [overflow-y:visible]"
      aria-hidden="true"
    >
      <Manchas
        recortar={false}
        // Solo desde tablet: en móvil el relleno de sección es menor y la
        // mancha alcanzaría el texto de la sección vecina.
        manchas={[{ color, x: lado === "izq" ? "-2%" : "102%", y: "0%", size, semilla, soloEscritorio: true }]}
      />
    </div>
  );
}
