"use client";

import { useEffect, useState } from "react";

import { Grafismo } from "./Grafismo";

/**
 * Celebración al confirmar una cita: el cartel "CURLY HAIR #ON" del manual
 * (capítulo 04), en pantalla completa y por menos de tres segundos.
 *
 *   1. Entra el fondo: las ondas verticales originales, terracota sobre rosa.
 *   2. Se abre desde el centro el cartel rosa liso.
 *   3. Suben las letras de CURLY HAIR (serif, terracota) y entra #ON
 *      (Inter ExtraBold, vino) con un pequeño rebote, como en la lámina.
 *   4. Todo sube y deja ver el resumen de la cita, que ya está debajo.
 *
 * Con `prefers-reduced-motion` no se muestra: se pasa directo al resumen.
 * Las animaciones viven en globals.css (clases `cel-*`).
 */
export function CurlyHairOn({ onFin }: { onFin: () => void }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onFin();
      return;
    }
    const salir = window.setTimeout(() => setSaliendo(true), 2100);
    const fin = window.setTimeout(onFin, 2700);
    return () => {
      window.clearTimeout(salir);
      window.clearTimeout(fin);
    };
  }, [onFin]);

  const letras = (palabra: string, desde: number) =>
    [...palabra].map((l, i) => (
      <span
        key={`${palabra}-${i}`}
        className="cel-letra"
        style={{ "--retraso": `${desde + i * 0.05}s` } as React.CSSProperties}
      >
        {l}
      </span>
    ));

  return (
    <div
      role="status"
      aria-live="polite"
      className={`cel-entra fixed inset-0 z-[70] overflow-hidden bg-pink ${saliendo ? "cel-sale" : ""}`}
    >
      <span className="sr-only">Tu cita quedó lista</span>

      <div className="cel-fondo absolute -inset-y-[10%] inset-x-0" aria-hidden="true">
        <Grafismo variante="vertical" fondo="var(--color-pink)" trazo="var(--color-terra)" />
      </div>

      <div
        className="cel-cartel absolute inset-5 flex items-center justify-center bg-pink sm:inset-10 md:inset-16"
        aria-hidden="true"
      >
        <p className="t-poster text-center text-[clamp(3.5rem,15vw,10rem)] leading-[0.88]">
          <span className="cel-linea text-terra">{letras("CURLY", 0.7)}</span>
          <span className="cel-linea text-terra">{letras("HAIR", 0.95)}</span>
          <span className="cel-on mt-2 block text-ink">
            <span className="t-pop">#ON</span>
          </span>
        </p>
      </div>
    </div>
  );
}
