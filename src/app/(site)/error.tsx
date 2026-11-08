"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Cuando algo falla en el sitio público.
 *
 * Lo que se le muestra a la clienta no dice nada técnico a propósito: el
 * mensaje real de un error de Prisma puede traer nombres de tablas o partes
 * de la cadena de conexión. Ese detalle va al log del servidor; acá solo va
 * el `digest`, que es el identificador con el que se encuentra en Vercel.
 */
export default function ErrorDelSitio({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sitio] error no controlado:", error);
  }, [error]);

  return (
    <section className="bg-canvas py-24 md:py-32">

      <div className="shell max-w-2xl text-center">
        <p className="t-eyebrow text-terra">Algo se rompió</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
          No pudimos cargar esta página
        </h1>
        <p className="mt-5 text-lg text-muted">
          Fue un problema nuestro, no tuyo. Vuelve a intentarlo; si sigue
          pasando, escríbenos y lo resolvemos contigo.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-ink-soft"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="rounded-full border border-cream bg-bone px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Volver al inicio
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-xs text-clay">
            Referencia del error: {error.digest}
          </p>
        )}
      </div>
    </section>
  );
}
