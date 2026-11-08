"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Cuando algo falla dentro del panel.
 *
 * Acá sí se muestra el mensaje: quien lo lee es el equipo, no una clienta, y
 * saber que Siigo respondió 401 o que se cayó la conexión a la base es
 * exactamente lo que hace falta para decidir si reintentar o llamar.
 */
export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel] error no controlado:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-cream bg-bone p-7">
        <p className="text-xs font-semibold tracking-widest text-terra uppercase">
          Algo falló
        </p>
        <h1 className="mt-2 font-display text-2xl text-ink">
          No se pudo cargar esta pantalla
        </h1>

        <p className="mt-4 text-sm text-muted">
          Nada se guardó a medias: si estabas editando, vuelve a intentarlo y
          revisa antes de guardar.
        </p>

        <pre className="mt-5 overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs break-words whitespace-pre-wrap text-clay">
          {error.message || "Error desconocido"}
        </pre>

        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-stone">
            Referencia: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-soft"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="rounded-full border border-cream px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Ir al resumen
          </Link>
        </div>
      </div>
    </div>
  );
}
