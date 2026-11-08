"use client";

import { useEffect, useState } from "react";

import { CitaDetalle, type CitaEditable } from "./CitaDetalle";
import { CitaTooltip, TooltipPortal, useCitaHover } from "./CitaTooltip";
import { BLOQUE_CITA, COLOR, PX_POR_MINUTO, distribuirColumnas, posicionBloque } from "./estado";
import type { Lookups } from "./ReservaForm";
import { ConfirmarMovimiento, FantasmaCita, useArrastreCita, type Fantasma } from "./ArrastrarCita";

/**
 * Rejilla semanal: los días son columnas y las horas filas.
 * Cada cita se posiciona por su hora de inicio y su alto es la duración,
 * así se ve de un vistazo dónde queda hueco. Un clic abre el mismo detalle
 * editable que usa la vista por profesionales.
 */

export type CitaSemana = CitaEditable & {
  ciudad: string;
  profesional: string | null;
  /** "2026-08-13" en hora de Bogotá */
  dia: string;
};

export type BloqueoSemana = {
  id: string;
  dia: string;
  inicioMin: number;
  finMin: number;
  reason: string | null;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function SemanaGrid({
  dias,
  citas,
  bloqueos,
  desdeMin,
  hastaMin,
  hoy,
  lookups,
}: {
  dias: string[];
  citas: CitaSemana[];
  bloqueos: BloqueoSemana[];
  desdeMin: number;
  hastaMin: number;
  hoy: string;
  lookups: Lookups;
}) {
  const [citaAbierta, setCitaAbierta] = useState<CitaSemana | null>(null);
  const { hover, onEnter, onLeave } = useCitaHover<CitaSemana>();
  // Arrastrar una cita la mueve de hora o de día (la profesional no cambia).
  const [soltada, setSoltada] = useState<Fantasma | null>(null);
  // La cita recién movida queda resaltada unos segundos, para verla en su sitio nuevo.
  const [recienMovida, setRecienMovida] = useState<string | null>(null);
  useEffect(() => {
    if (!recienMovida) return;
    const t = window.setTimeout(() => setRecienMovida(null), 6000);
    return () => window.clearTimeout(t);
  }, [recienMovida]);
  const arrastreCita = useArrastreCita({
    desdeMin,
    hastaMin,
    colDe: (id) => citas.find((c) => c.id === id)?.dia ?? "",
    onSoltar: setSoltada,
    onEmpezar: onLeave,
  });
  const citaSoltada = soltada && citas.find((c) => c.id === soltada.citaId);

  const totalMin = hastaMin - desdeMin;
  // 1 minuto = 1.1 px da filas de hora cómodas sin que la página crezca de más.
  const alto = Math.round(totalMin * PX_POR_MINUTO);
  const horas: number[] = [];
  for (let m = Math.ceil(desdeMin / 60) * 60; m <= hastaMin; m += 60) horas.push(m);

  const pct = (min: number) => ((min - desdeMin) / totalMin) * 100;

  return (
    <>
      <div className="admin-card overflow-x-auto">
        <div className="min-w-[820px]">
          {/* Encabezado de días */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-stone">
            <span />
            {dias.map((d) => {
              const [a, m, dd] = d.split("-").map(Number);
              // El mes va base 0 en Date.UTC.
              const dow = new Date(Date.UTC(a, m - 1, dd)).getUTCDay();
              return (
                <div
                  key={d}
                  className={`border-l border-stone px-2 py-2.5 text-center ${
                    d === hoy ? "bg-cream" : ""
                  }`}
                >
                  <p className="t-eyebrow text-clay">{DIAS[dow]}</p>
                  <p className={`text-sm ${d === hoy ? "font-semibold text-terra" : "text-ink"}`}>
                    {dd}/{m}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Cuerpo */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: alto }}>
            {/* Columna de horas */}
            <div className="relative">
              {horas.map((h) => (
                <span
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-clay"
                  style={{ top: `${pct(h)}%` }}
                >
                  {String(Math.floor(h / 60)).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {dias.map((d) => {
              const citasDia = citas.filter((c) => c.dia === d);
              const columnas = distribuirColumnas(citasDia);

              return (
                <div key={d} data-col={d} className={`relative border-l border-stone ${d === hoy ? "bg-cream/40" : ""}`}>
                  {/* Líneas de hora */}
                  {horas.map((h) => (
                    <span
                      key={h}
                      className="absolute inset-x-0 border-t border-stone/60"
                      style={{ top: `${pct(h)}%` }}
                    />
                  ))}

                  {/* Bloqueos, por debajo de las citas */}
                  {bloqueos
                    .filter((b) => b.dia === d)
                    .map((b) => (
                      <div
                        key={b.id}
                        title={b.reason ?? "Bloqueado"}
                        className="media-hatch absolute inset-x-0 bg-stone/40"
                        style={{
                          top: `${pct(Math.max(b.inicioMin, desdeMin))}%`,
                          height: `${((Math.min(b.finMin, hastaMin) - Math.max(b.inicioMin, desdeMin)) / totalMin) * 100}%`,
                        }}
                      >
                        <span className="block px-1.5 pt-1 text-[10px] text-muted">
                          {b.reason ?? "Bloqueado"}
                        </span>
                      </div>
                    ))}

                  {/* Citas — lado a lado cuando se solapan en el tiempo */}
                  {citasDia.map((c) => {
                    const { columna, columnas: total } = columnas.get(c.id) ?? {
                      columna: 0,
                      columnas: 1,
                    };
                    const { style: estiloArrastre, ...arrastrable } = arrastreCita.props(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        {...arrastrable}
                        onClick={() => setCitaAbierta(c)}
                        onMouseEnter={onEnter(c)}
                        onMouseLeave={onLeave}
                        className={`${BLOQUE_CITA} ${
                          COLOR[c.status] ?? "border-l-clay bg-smoke"
                        } ${arrastreCita.fantasma?.citaId === c.id ? "opacity-40" : ""} ${
                        recienMovida === c.id ? "z-10 ring-2 ring-emerald-500 ring-offset-1" : ""
                      }`}
                        style={{
                          ...estiloArrastre,
                          ...posicionBloque(
                            pct(c.inicioMin),
                            ((c.finMin - c.inicioMin) / totalMin) * 100,
                          ),
                          left: `calc(${(columna / total) * 100}% + 3px)`,
                          width: `calc(${(1 / total) * 100}% - 6px)`,
                        }}
                      >
                        <div className="h-full px-2 py-1 text-[11px] leading-snug">
                          <span className="block truncate whitespace-nowrap font-mono text-[10px] opacity-70">
                            {total >= 2
                              ? aHora(c.inicioMin)
                              : `${aHora(c.inicioMin)} – ${aHora(c.finMin)}`}
                          </span>
                          <span className="block truncate font-semibold">
                            {c.firstVisit && "★ "}
                            {c.clientName}
                          </span>
                          <span className="block truncate opacity-75">{c.servicio}</span>
                        </div>
                      </button>
                    );
                  })}

                  {arrastreCita.fantasma?.col === d && (
                    <FantasmaCita
                      f={arrastreCita.fantasma}
                      titulo={citas.find((c) => c.id === arrastreCita.fantasma!.citaId)?.clientName ?? ""}
                      top={`${pct(arrastreCita.fantasma.inicioMin)}%`}
                      height={`${((arrastreCita.fantasma.finMin - arrastreCita.fantasma.inicioMin) / totalMin) * 100}%`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hover && (
        <TooltipPortal top={hover.top} left={hover.left} placement={hover.placement}>
          <CitaTooltip
            titulo={`${hover.item.firstVisit ? "★ " : ""}${hover.item.clientName}`}
            subtitulo={hover.item.servicio}
            estado={hover.item.status}
            detalle={hover.item}
            filas={[
              { label: "Profesional", value: hover.item.profesional ?? "Sin asignar" },
              { label: "Local", value: hover.item.ciudad },
              {
                label: "Horario",
                value: `${aHora(hover.item.inicioMin)} – ${aHora(hover.item.finMin)}`,
              },
              { label: "Teléfono", value: hover.item.clientPhone },
              { label: "Código", value: hover.item.code },
            ]}
          />
        </TooltipPortal>
      )}

      {soltada && citaSoltada && (
        <ConfirmarMovimiento
          citaId={citaSoltada.id}
          cliente={citaSoltada.clientName}
          servicio={citaSoltada.servicio}
          fecha={soltada.col}
          antes={{ profesional: null, inicioMin: citaSoltada.inicioMin, fecha: citaSoltada.dia }}
          despues={{ profesional: null, inicioMin: soltada.inicioMin, finMin: soltada.finMin }}
          onCerrar={(movida) => {
            setSoltada(null);
            arrastreCita.limpiar();
            setRecienMovida(movida);
          }}
        />
      )}

      <CitaDetalle
        key={citaAbierta?.id}
        cita={citaAbierta}
        lookups={lookups}
        onClose={() => setCitaAbierta(null)}
      />
    </>
  );
}
