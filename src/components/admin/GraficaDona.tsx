"use client";

import { useState } from "react";

import { formatCOP } from "@/lib/format";

/**
 * Dona con leyenda: cada tajada es una parte del total en pesos. Al pasar el
 * mouse (o tocar) una tajada o su fila de la leyenda se ven el % y los pesos.
 * La leyenda siempre muestra el texto, así que el color nunca es lo único que
 * identifica una parte.
 *
 * Los colores salen de una paleta validada para daltonismo (azul, naranja,
 * aguamarina, ciruela; gris para lo "sin especificar"): las tajadas de una
 * dona se tocan entre todas, así que se validó con todos los pares.
 */

export type Tajada = { id: string; label: string; valor: number; color: string };


const TAMANO = 168;
const GROSOR = 26;
const RADIO = (TAMANO - GROSOR) / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Hueco entre tajadas, en px a lo largo del anillo. */
const SEPARACION = 2;

const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);
const pctTexto = (p: number) => (p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`);

export function GraficaDona({
  titulo,
  tajadas,
  vacio = "Sin movimientos en este período.",
}: {
  titulo: string;
  tajadas: Tajada[];
  vacio?: string;
}) {
  const [activa, setActiva] = useState<string | null>(null);
  const conValor = tajadas.filter((t) => t.valor > 0);
  const total = conValor.reduce((s, t) => s + t.valor, 0);
  const sel = conValor.find((t) => t.id === activa) ?? null;

  // Cada tajada arranca donde terminó la anterior; desde las 12 en punto.
  let acumulado = 0;
  const arcos = conValor.map((t) => {
    const largo = (t.valor / total) * CIRCUNFERENCIA;
    const arco = { ...t, inicio: acumulado, largo };
    acumulado += largo;
    return arco;
  });
  const gap = conValor.length > 1 ? SEPARACION : 0;

  return (
    <div className="admin-card bg-paper p-5 sm:p-6">
      <p className="admin-kicker mb-4">{titulo}</p>
      {total === 0 ? (
        <p className="t-small py-10 text-center">{vacio}</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0" style={{ width: TAMANO, height: TAMANO }}>
            <svg
              width={TAMANO}
              height={TAMANO}
              viewBox={`0 0 ${TAMANO} ${TAMANO}`}
              className="-rotate-90 overflow-visible"
              role="img"
              aria-label={`${titulo}: ${conValor
                .map((t) => `${t.label} ${pctTexto(pct(t.valor, total))}, ${formatCOP(t.valor)}`)
                .join("; ")}`}
              onMouseLeave={() => setActiva(null)}
            >
              {arcos.map((a) => (
                <circle
                  key={a.id}
                  cx={TAMANO / 2}
                  cy={TAMANO / 2}
                  r={RADIO}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={activa === a.id ? GROSOR + 6 : GROSOR}
                  strokeDasharray={`${Math.max(a.largo - gap, 0.5)} ${CIRCUNFERENCIA}`}
                  strokeDashoffset={-a.inicio}
                  opacity={activa && activa !== a.id ? 0.35 : 1}
                  className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                  onMouseEnter={() => setActiva(a.id)}
                  onClick={() => setActiva((v) => (v === a.id ? null : a.id))}
                />
              ))}
            </svg>
            {/* Centro: el total, o la tajada bajo el mouse. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
              {sel ? (
                <>
                  <span className="text-2xl font-semibold text-ink">{pctTexto(pct(sel.valor, total))}</span>
                  <span className="text-xs font-semibold text-ink">{formatCOP(sel.valor)}</span>
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted">{sel.label}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] tracking-[0.1em] text-muted uppercase">Total</span>
                  <span className="text-sm font-semibold text-ink">{formatCOP(total)}</span>
                </>
              )}
            </div>
          </div>

          <ul className="w-full min-w-0 space-y-1">
            {conValor.map((t) => {
              const p = pct(t.valor, total);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiva(t.id)}
                    onMouseLeave={() => setActiva(null)}
                    onFocus={() => setActiva(t.id)}
                    onBlur={() => setActiva(null)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      activa === t.id ? "bg-sand/60" : "hover:bg-sand/40"
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: t.color }} aria-hidden />
                    <span className="min-w-0 flex-1 leading-tight text-ink">{t.label}</span>
                    <span className="shrink-0 font-semibold text-ink tabular-nums">{pctTexto(p)}</span>
                    <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">
                      {formatCOP(t.valor)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
