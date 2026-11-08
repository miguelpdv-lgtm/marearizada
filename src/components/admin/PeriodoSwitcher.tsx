import Link from "next/link";

import { PERIODOS, PERIODO_LABEL, type Periodo } from "@/lib/reportPeriod";

/**
 * Selector de período (Día/Semana/Mes/Año) + navegación anterior/hoy/siguiente,
 * para las páginas de Reportes. Puramente presentacional: cada página arma
 * los enlaces con su propia lógica de sede/otros filtros.
 */
export function PeriodoSwitcher({
  periodo,
  etiqueta,
  hrefPeriodo,
  hrefTodo,
  navegacion,
  extra,
}: {
  /** `null` = sin filtro de fecha (ver `hrefTodo`). */
  periodo: Periodo | null;
  etiqueta: string;
  hrefPeriodo: (p: Periodo) => string;
  /** Si se pasa, agrega un botón "Todo" al frente — activo cuando `periodo` es `null`. */
  hrefTodo?: string;
  /** Flechas anterior/hoy/siguiente — se ocultan si no hay período activo. */
  navegacion?: { anterior: string; hoy: string; siguiente: string };
  /** p. ej. el botón "Descargar CSV", para no romper el mismo renglón. */
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex">
        {hrefTodo && (
          <Link
            href={hrefTodo}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              periodo === null ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
            }`}
          >
            Todo
          </Link>
        )}
        {PERIODOS.map((p, i) => (
          <Link
            key={p}
            href={hrefPeriodo(p)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              i > 0 || hrefTodo ? "border-l-0" : ""
            } ${
              periodo === p ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
            }`}
          >
            {PERIODO_LABEL[p]}
          </Link>
        ))}
      </div>

      <p className="t-small">{etiqueta}</p>

      {navegacion && (
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={navegacion.anterior}
             className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone text-ink transition-colors hover:border-terra"
            aria-label="Período anterior"
          >
            ←
          </Link>
          <Link
            href={navegacion.hoy}
             className="rounded-lg border border-stone px-4 py-2 text-sm text-ink transition-colors hover:border-terra"
          >
            Hoy
          </Link>
          <Link
            href={navegacion.siguiente}
             className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone text-ink transition-colors hover:border-terra"
            aria-label="Período siguiente"
          >
            →
          </Link>
          {extra}
        </div>
      )}
      {!navegacion && extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
    </div>
  );
}
