"use client";

import { useEffect, useRef, useState } from "react";

import { Thumb } from "@/components/admin/ui";
import { CitaDetalle, type CitaEditable } from "./CitaDetalle";
import { CitaTooltip, TooltipPortal, useCitaHover } from "./CitaTooltip";
import {
  BLOQUE_CITA,
  COLOR,
  PX_POR_MINUTO,
  aHoraTexto,
  distribuirColumnas,
  posicionBloque,
} from "./estado";
import type { Lookups } from "./ReservaForm";
import { DetalleBloqueo, DetalleHabilitacion, NuevoBloqueo } from "./BloqueoEnAgenda";
import { ConfirmarMovimiento, FantasmaCita, useArrastreCita, type Fantasma } from "./ArrastrarCita";

/**
 * Calendario de un solo día con los profesionales como columnas, en vez de
 * los días como columnas (eso ya lo cubre SemanaGrid). Reutiliza el mismo
 * eje de tiempo por porcentaje.
 */

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export type CitaProfesional = CitaEditable & { staffId: string };

export type Profesional = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type FranjaNoDisponible = {
  id: string;
  staffId: string;
  inicioMin: number;
  finMin: number;
  label: string;
  /** Presente si la franja es un bloqueo creado a mano (no el horario). */
  bloqueo?: {
    id: string;
    /** Sin profesional: bloquea a toda la sede. */
    sedeEntera: boolean;
    motivo: string | null;
    /** "YYYY-MM-DD HH:MM" en hora de Bogotá. */
    desde: string;
    hasta: string;
  };
};

/** Horas abiertas a mano para ese día, fuera del horario semanal. */
export type FranjaHabilitada = {
  id: string;
  staffId: string;
  inicioMin: number;
  finMin: number;
  motivo: string | null;
};

export function AgendaProfesionales({
  branchId,
  fecha,
  profesionales,
  citas,
  noDisponible,
  habilitadas,
  desdeMin,
  hastaMin,
  ahoraMin,
  lookups,
}: {
  /** Sede y día que se están viendo: es donde se crean los bloqueos. */
  branchId: string;
  fecha: string;
  profesionales: Profesional[];
  citas: CitaProfesional[];
  noDisponible: FranjaNoDisponible[];
  habilitadas: FranjaHabilitada[];
  desdeMin: number;
  hastaMin: number;
  /** Minutos desde medianoche si se está viendo el día de hoy; si no, null. */
  ahoraMin: number | null;
  lookups: Lookups;
}) {
  const [citaAbierta, setCitaAbierta] = useState<CitaProfesional | null>(null);
  const { hover, onEnter, onLeave } = useCitaHover<CitaProfesional>();
  // Bloquear arrastrando sobre una columna: mientras se arrastra se ve el
  // rango; al soltar se abre la ventana para confirmar.
  const [arrastre, setArrastre] = useState<{ staffId: string; ini: number; fin: number } | null>(null);
  const origen = useRef<number | null>(null);
  const [nuevo, setNuevo] = useState<{ profesional: Profesional; ini: number; fin: number } | null>(null);
  const [detalle, setDetalle] = useState<{
    bloqueo: NonNullable<FranjaNoDisponible["bloqueo"]>;
    profesional: Profesional;
  } | null>(null);
  const [habilitacion, setHabilitacion] = useState<{
    franja: FranjaHabilitada;
    profesional: string;
  } | null>(null);

  // Mover citas arrastrándolas a otra hora o a otra profesional.
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
    colDe: (id) => citas.find((c) => c.id === id)?.staffId ?? "",
    onSoltar: setSoltada,
    onEmpezar: onLeave,
  });
  const citaSoltada = soltada && citas.find((c) => c.id === soltada.citaId);

  if (profesionales.length === 0) {
    return (
      <div className="admin-card p-10 text-center">
        <p className="t-small">Esta sede no tiene profesionales activos.</p>
      </div>
    );
  }

  const totalMin = hastaMin - desdeMin;
  const alto = Math.round(totalMin * PX_POR_MINUTO);
  const horas: number[] = [];
  for (let m = Math.ceil(desdeMin / 60) * 60; m <= hastaMin; m += 60) horas.push(m);

  const pct = (min: number) => ((min - desdeMin) / totalMin) * 100;

  /** Minuto del día bajo el puntero, ajustado a la grilla de 15 minutos. */
  const minutoEn = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const crudo = desdeMin + ((e.clientY - r.top) / r.height) * totalMin;
    return Math.max(desdeMin, Math.min(hastaMin, Math.round(crudo / 15) * 15));
  };
  // 200 px: con dos citas lado a lado cada una queda en ~95, lo justo para
  // leer la hora y el nombre.
  const cols = `56px repeat(${profesionales.length}, minmax(200px, 1fr))`;

  return (
    <>
      <p className="t-small mb-2">
        Arrastra una cita para moverla de hora o de profesional. Arrastra sobre el espacio libre de
        una columna (o toca una hora) para bloquear o habilitar horas. Toca un bloqueo 🔒 para desbloquearlo completo, solo una parte o solo para una
        profesional.
      </p>
      <div className="admin-card overflow-x-auto">
        <div style={{ minWidth: 56 + profesionales.length * 200 }}>
          {/* Encabezado de profesionales */}
          <div className="grid border-b border-stone" style={{ gridTemplateColumns: cols }}>
            <span />
            {profesionales.map((p) => (
              <div
                key={p.id}
                className="flex flex-col items-center gap-1.5 border-l border-stone px-2 py-3"
              >
                <Thumb src={p.imageUrl} alt={p.name} fallback="🙂" />
                <p className="truncate text-xs text-ink">{p.name}</p>
                <button
                  type="button"
                  onClick={() =>
                    setNuevo({ profesional: p, ini: Math.floor(desdeMin / 15) * 15, fin: hastaMin })
                  }
                  className="text-[10px] tracking-[0.08em] text-clay uppercase underline-offset-2 hover:text-terra hover:underline"
                >
                  Bloquear / habilitar
                </button>
              </div>
            ))}
          </div>

          {/* Cuerpo */}
          <div className="grid" style={{ gridTemplateColumns: cols, height: alto }}>
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

            {profesionales.map((p) => {
              const citasDe = citas.filter((c) => c.staffId === p.id);
              const columnas = distribuirColumnas(citasDe);
              return (
              <div key={p.id} data-col={p.id} className="relative border-l border-stone">
                {/* Capa para arrastrar y bloquear: va debajo de citas y
                    bloqueos, que siguen recibiendo sus clics. */}
                <div
                  className="absolute inset-0 cursor-crosshair touch-none"
                  title="Arrastra para bloquear o habilitar horas"
                  onPointerDown={(e) => {
                    const m = minutoEn(e);
                    origen.current = m;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setArrastre({ staffId: p.id, ini: m, fin: m });
                  }}
                  onPointerMove={(e) => {
                    if (origen.current === null) return;
                    const m = minutoEn(e);
                    setArrastre({
                      staffId: p.id,
                      ini: Math.min(origen.current, m),
                      fin: Math.max(origen.current, m),
                    });
                  }}
                  onPointerUp={() => {
                    if (origen.current === null || !arrastre) return;
                    origen.current = null;
                    // Un toque sin arrastrar propone una hora.
                    const fin = arrastre.fin - arrastre.ini < 15 ? Math.min(arrastre.ini + 60, hastaMin) : arrastre.fin;
                    setNuevo({ profesional: p, ini: arrastre.ini, fin });
                    setArrastre(null);
                  }}
                />
                {arrastre?.staffId === p.id && arrastre.fin > arrastre.ini && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 border-2 border-dashed border-terra bg-terra/15"
                    style={{
                      top: `${pct(arrastre.ini)}%`,
                      height: `${((arrastre.fin - arrastre.ini) / totalMin) * 100}%`,
                    }}
                  >
                    <span className="block px-1.5 pt-0.5 font-mono text-[10px] text-terra">
                      {aHora(arrastre.ini)} – {aHora(arrastre.fin)}
                    </span>
                  </div>
                )}
                {horas.map((h) => (
                  <span
                    key={h}
                    className="absolute inset-x-0 border-t border-stone/60"
                    style={{ top: `${pct(h)}%` }}
                  />
                ))}

                {noDisponible
                  .filter((n) => n.staffId === p.id)
                  .map((n) => {
                    const estilo = {
                      top: `${pct(Math.max(n.inicioMin, desdeMin))}%`,
                      height: `${((Math.min(n.finMin, hastaMin) - Math.max(n.inicioMin, desdeMin)) / totalMin) * 100}%`,
                    };
                    // Fuera del horario de la profesional: solo se pinta.
                    if (!n.bloqueo) {
                      return (
                        <div
                          key={n.id}
                          title={n.label}
                          className="media-hatch pointer-events-none absolute inset-x-0 bg-stone/40"
                          style={estilo}
                        >
                          <span className="block px-1.5 pt-1 text-[10px] text-muted">{n.label}</span>
                        </div>
                      );
                    }
                    // Un bloqueo: se toca para ver el detalle y desbloquear.
                    const bloqueo = n.bloqueo;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setDetalle({ bloqueo, profesional: p })}
                        title="Ver o quitar este bloqueo"
                        className="media-hatch absolute inset-x-0 z-[5] overflow-hidden border-y-2 border-ink/40 bg-ink/15 text-left transition-colors hover:bg-ink/25"
                        style={estilo}
                      >
                        <span className="block truncate px-1.5 pt-1 text-[10px] font-semibold text-ink">
                          🔒 {bloqueo.motivo ?? "Bloqueado"}
                          {bloqueo.sedeEntera && " · toda la sede"}
                        </span>
                        <span className="block px-1.5 font-mono text-[10px] text-ink/70">
                          {aHora(Math.max(n.inicioMin, desdeMin))} – {aHora(Math.min(n.finMin, hastaMin))}
                        </span>
                      </button>
                    );
                  })}

                {habilitadas
                  .filter((h) => h.staffId === p.id)
                  .map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHabilitacion({ franja: h, profesional: p.name })}
                      title="Horas habilitadas: toca para quitarlas"
                      className="absolute inset-x-0 z-[4] overflow-hidden border-y-2 border-emerald-600/50 bg-emerald-500/10 text-left transition-colors hover:bg-emerald-500/20"
                      style={{
                        top: `${pct(Math.max(h.inicioMin, desdeMin))}%`,
                        height: `${((Math.min(h.finMin, hastaMin) - Math.max(h.inicioMin, desdeMin)) / totalMin) * 100}%`,
                      }}
                    >
                      <span className="block truncate px-1.5 pt-1 text-[10px] font-semibold text-emerald-800">
                        ✓ Horas habilitadas{h.motivo && ` · ${h.motivo}`}
                      </span>
                      <span className="block px-1.5 font-mono text-[10px] text-emerald-800/70">
                        {aHora(h.inicioMin)} – {aHora(h.finMin)}
                      </span>
                    </button>
                  ))}

                {citasDe.map((c) => {
                  const { columna, columnas: total } = columnas.get(c.id) ?? {
                    columna: 0,
                    columnas: 1,
                  };
                  const { style: estiloArrastre, ...arrastrable } = arrastreCita.props(c);
                  const moviendose = arrastreCita.fantasma?.citaId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      {...arrastrable}
                      onClick={() => setCitaAbierta(c)}
                      onMouseEnter={onEnter(c)}
                      onMouseLeave={onLeave}
                      className={`${BLOQUE_CITA} text-[11px] leading-snug ${
                        COLOR[c.status] ?? "border-l-clay bg-smoke"
                      } ${moviendose ? "opacity-40" : ""} ${
                        recienMovida === c.id ? "z-10 ring-2 ring-emerald-500 ring-offset-1" : ""
                      }`}
                      style={{
                        ...estiloArrastre,
                        ...posicionBloque(
                          pct(c.inicioMin),
                          ((c.finMin - c.inicioMin) / totalMin) * 100,
                        ),
                        left: `calc(${(columna / total) * 100}% + 4px)`,
                        width: `calc(${(1 / total) * 100}% - 8px)`,
                      }}
                    >
                      <div className="h-full px-2 py-1">
                        {/* Con tres o más a la vez la tarjeta queda angosta y
                            el rango se partía en tres líneas: ahí va solo el
                            inicio. El fin se ve en el alto del bloque. */}
                        <span className="block truncate whitespace-nowrap font-mono text-[10px] opacity-70">
                          {total >= 3
                            ? aHoraTexto(c.inicioMin)
                            : `${aHoraTexto(c.inicioMin)} – ${aHoraTexto(c.finMin)}`}
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

                {arrastreCita.fantasma?.col === p.id && (
                  <FantasmaCita
                    f={arrastreCita.fantasma}
                    titulo={citas.find((c) => c.id === arrastreCita.fantasma!.citaId)?.clientName ?? ""}
                    top={`${pct(arrastreCita.fantasma.inicioMin)}%`}
                    height={`${((arrastreCita.fantasma.finMin - arrastreCita.fantasma.inicioMin) / totalMin) * 100}%`}
                  />
                )}

                {ahoraMin !== null && ahoraMin >= desdeMin && ahoraMin <= hastaMin && (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                    style={{ top: `${pct(ahoraMin)}%` }}
                  >
                    <span className="absolute top-0 -left-0.5 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" />
                  </span>
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
              {
                label: "Horario",
                value: `${aHora(hover.item.inicioMin)} – ${aHora(hover.item.finMin)}`,
              },
              { label: "Teléfono", value: hover.item.clientPhone },
              ...(hover.item.curlType
                ? [{ label: "Tipo de rizo", value: hover.item.curlType.toLowerCase() }]
                : []),
              { label: "Primera vez", value: hover.item.firstVisit ? "Sí" : "No" },
              { label: "Código", value: hover.item.code },
            ]}
          />
        </TooltipPortal>
      )}

      {nuevo && (
        <NuevoBloqueo
          branchId={branchId}
          fecha={fecha}
          profesional={nuevo.profesional}
          inicioMin={nuevo.ini}
          finMin={nuevo.fin}
          onCerrar={() => setNuevo(null)}
        />
      )}
      {detalle && (
        <DetalleBloqueo
          fecha={fecha}
          bloqueo={detalle.bloqueo}
          profesional={detalle.profesional}
          onCerrar={() => setDetalle(null)}
        />
      )}
      {habilitacion && (
        <DetalleHabilitacion
          franja={habilitacion.franja}
          profesional={habilitacion.profesional}
          onCerrar={() => setHabilitacion(null)}
        />
      )}

      {soltada && citaSoltada && (
        <ConfirmarMovimiento
          citaId={citaSoltada.id}
          cliente={citaSoltada.clientName}
          servicio={citaSoltada.servicio}
          fecha={fecha}
          antes={{
            profesional: profesionales.find((p) => p.id === citaSoltada.staffId) ?? null,
            inicioMin: citaSoltada.inicioMin,
            fecha: citaSoltada.date,
          }}
          despues={{
            profesional: profesionales.find((p) => p.id === soltada.col) ?? null,
            inicioMin: soltada.inicioMin,
            finMin: soltada.finMin,
          }}
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
