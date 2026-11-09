"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bloquearEnAgenda,
  desbloquearParte,
  habilitarHoras,
  quitarBloqueo,
  quitarHabilitacion,
} from "./bloqueos/actions";

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const hora12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "p.m." : "a.m."}`;
};

/** Los motivos de siempre, a un toque. */
const MOTIVOS = ["Almuerzo", "Capacitación", "Cita médica", "Personal", "Vacaciones"];

function Ventana({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="presentation"
      onClick={onCerrar}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="admin-card w-full max-w-sm bg-paper p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="t-card text-lg text-ink">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone text-ink hover:border-marea"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Desde / Hasta en pasos de 15 minutos. */
function Horas({
  desde,
  hasta,
  onDesde,
  onHasta,
}: {
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Desde</span>
        <input
          type="time"
          step={900}
          value={desde}
          onChange={(e) => onDesde(e.target.value)}
          className="admin-control w-full px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Hasta</span>
        <input
          type="time"
          step={900}
          value={hasta}
          onChange={(e) => onHasta(e.target.value)}
          className="admin-control w-full px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}

/**
 * Un rango arrastrado (o tocado) sobre la columna de una profesional:
 * bloquearlo (para ella o toda la sede) o habilitarlo, que la deja disponible
 * aunque esté bloqueada o fuera de su horario ese día.
 */
export function NuevoBloqueo({
  branchId,
  fecha,
  profesional,
  inicioMin,
  finMin,
  onCerrar,
}: {
  branchId: string;
  fecha: string;
  profesional: { id: string; name: string };
  inicioMin: number;
  finMin: number;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [desde, setDesde] = useState(aHora(inicioMin));
  const [hasta, setHasta] = useState(aHora(Math.min(finMin, 23 * 60 + 59)));
  const [motivo, setMotivo] = useState("");
  const [toda, setToda] = useState(false);
  const [modo, setModo] = useState<"bloquear" | "habilitar">("bloquear");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      if (modo === "habilitar") {
        const r = await habilitarHoras({
          branchId,
          staffId: profesional.id,
          fecha,
          horaInicio: desde,
          horaFin: hasta,
          reason: motivo || undefined,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        router.refresh();
        if (!r.fueraDeHorario && r.desbloqueados === 0) {
          setAviso(`${profesional.name} ya estaba disponible en ese horario: no había nada que desbloquear.`);
          return;
        }
        onCerrar();
        return;
      }
      const r = await bloquearEnAgenda({
        branchId,
        staffId: toda ? null : profesional.id,
        fecha,
        horaInicio: desde,
        horaFin: hasta,
        reason: motivo || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      if (r.citasAfectadas > 0) {
        setAviso(
          `Bloqueado. Ojo: ${r.citasAfectadas === 1 ? "hay 1 cita" : `hay ${r.citasAfectadas} citas`} ya agendada${r.citasAfectadas === 1 ? "" : "s"} en ese rango; no se cancelan solas.`,
        );
        return;
      }
      onCerrar();
    });
  };

  if (aviso) {
    return (
      <Ventana titulo={modo === "habilitar" ? "Horas habilitadas" : "Horas bloqueadas"} onCerrar={onCerrar}>
        <p className="text-sm text-ink">{aviso}</p>
        <button type="button" onClick={onCerrar} className="mt-4 btn btn-primary px-5 py-3 text-sm">
          Entendido
        </button>
      </Ventana>
    );
  }

  return (
    <Ventana
      titulo={
        modo === "habilitar"
          ? `Habilitar a ${profesional.name}`
          : `Bloquear a ${toda ? "toda la sede" : profesional.name}`
      }
      onCerrar={onCerrar}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 border border-stone text-sm" role="tablist">
          {(
            [
              ["bloquear", "🔒 Bloquear"],
              ["habilitar", "✓ Habilitar"],
            ] as const
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={modo === v}
              onClick={() => setModo(v)}
              className={`py-2 transition-colors ${modo === v ? "bg-[#9ee5e7] font-semibold text-[#1f2725]" : "text-[#3d4643] hover:bg-[#effbfb]"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {modo === "habilitar" && (
          <p className="t-small">
            Deja a {profesional.name} disponible para citas en esas horas: le quita los bloqueos (también su
            parte de un bloqueo de toda la sede) y, si es fuera de su horario, se las abre solo ese día.
          </p>
        )}

        <Horas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />

        <div>
          <span className="mb-1.5 block text-xs text-muted">Motivo (opcional)</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className={`border px-2.5 py-1 text-xs transition-colors ${
                  motivo === m
                    ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]"
                    : "border-[1.5px] border-[#d3e3e1] bg-white text-[#3d4643] hover:border-[#1c6f75]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O escribe uno…"
            className="admin-control w-full px-3 py-2 text-sm"
          />
        </div>

        {modo === "bloquear" && (
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={toda}
              onChange={(e) => setToda(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-marea"
            />
            <span className="text-sm text-ink">
              Bloquear a toda la sede
              <span className="t-small block">Para todas las profesionales (festivo, cierre).</span>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-terra">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="btn btn-primary px-5 py-3 text-sm"
          >
            {modo === "habilitar"
              ? pending
                ? "Habilitando…"
                : `Habilitar ${hora12(desde)} – ${hora12(hasta)}`
              : pending
                ? "Bloqueando…"
                : `Bloquear ${hora12(desde)} – ${hora12(hasta)}`}
          </button>
          <button type="button" onClick={onCerrar} className="text-xs text-clay underline underline-offset-2">
            Cancelar
          </button>
        </div>
      </div>
    </Ventana>
  );
}

/**
 * Un bloqueo existente: qué es y a quién afecta. Se puede quitar completo,
 * solo una parte de las horas o, si es de toda la sede, solo para la
 * profesional de esa columna.
 */
export function DetalleBloqueo({
  fecha,
  bloqueo,
  profesional,
  onCerrar,
}: {
  /** Día que se está viendo: las horas parciales se toman sobre ese día. */
  fecha: string;
  bloqueo: {
    id: string;
    sedeEntera: boolean;
    motivo: string | null;
    desde: string;
    hasta: string;
  };
  profesional: { id: string; name: string };
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [diaIni, horaIni] = bloqueo.desde.split(" ");
  const [diaFin, horaFin] = bloqueo.hasta.split(" ");
  const rango =
    diaIni === diaFin
      ? `${hora12(horaIni)} – ${hora12(horaFin)}`
      : `${diaIni} ${hora12(horaIni)} → ${diaFin} ${hora12(horaFin)}`;

  // Por defecto, la parte del bloqueo que cae en el día que se ve.
  const [parcial, setParcial] = useState(false);
  const [desde, setDesde] = useState(diaIni < fecha ? "00:00" : horaIni);
  const [hasta, setHasta] = useState(diaFin > fecha ? "23:45" : horaFin);
  const [soloElla, setSoloElla] = useState(false);

  const correr = (accion: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      setError(null);
      const r = await accion();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      onCerrar();
    });

  const quien = soloElla ? profesional.name : bloqueo.sedeEntera ? "toda la sede" : profesional.name;

  return (
    <Ventana titulo="Horas bloqueadas" onCerrar={onCerrar}>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">A quién</dt>
          <dd className="text-right text-ink">{bloqueo.sedeEntera ? "Toda la sede" : profesional.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Cuándo</dt>
          <dd className="text-right text-ink">{rango}</dd>
        </div>
        {bloqueo.motivo && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Motivo</dt>
            <dd className="text-right text-ink">{bloqueo.motivo}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 space-y-3 border-t border-stone pt-4">
        <p className="text-xs tracking-[0.12em] text-muted uppercase">Desbloquear</p>
        {bloqueo.sedeEntera && (
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={soloElla}
              onChange={(e) => setSoloElla(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-marea"
            />
            <span className="text-sm text-ink">
              Solo para {profesional.name}
              <span className="t-small block">Las demás profesionales siguen bloqueadas.</span>
            </span>
          </label>
        )}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={parcial}
            onChange={(e) => setParcial(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-marea"
          />
          <span className="text-sm text-ink">
            Solo unas horas
            <span className="t-small block">El resto del bloqueo se queda como está.</span>
          </span>
        </label>
        {parcial && <Horas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />}
      </div>

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            correr(() =>
              !parcial && !soloElla
                ? quitarBloqueo(bloqueo.id)
                : desbloquearParte({
                    id: bloqueo.id,
                    staffId: soloElla ? profesional.id : null,
                    ...(parcial ? { fecha, horaInicio: desde, horaFin: hasta } : {}),
                  }),
            )
          }
          className="bg-terra px-5 py-2.5 text-sm text-paper disabled:opacity-60"
        >
          {pending
            ? "Desbloqueando…"
            : parcial
              ? `Desbloquear ${hora12(desde)} – ${hora12(hasta)} a ${quien}`
              : `Desbloquear a ${quien}`}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-clay underline underline-offset-2">
          Cerrar
        </button>
      </div>
    </Ventana>
  );
}

/** Horas habilitadas fuera del horario: qué son y el botón para quitarlas. */
export function DetalleHabilitacion({
  franja,
  profesional,
  onCerrar,
}: {
  franja: {
    id: string;
    inicioMin: number;
    finMin: number;
    motivo: string | null;
  };
  profesional: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Ventana titulo="Horas habilitadas" onCerrar={onCerrar}>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Profesional</dt>
          <dd className="text-right text-ink">{profesional}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Cuándo</dt>
          <dd className="text-right text-ink">
            {hora12(aHora(franja.inicioMin))} – {hora12(aHora(Math.min(franja.finMin, 23 * 60 + 59)))}
          </dd>
        </div>
        {franja.motivo && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Motivo</dt>
            <dd className="text-right text-ink">{franja.motivo}</dd>
          </div>
        )}
      </dl>
      <p className="t-small mt-3">
        Está fuera de su horario semanal y se abrió solo para este día. Al quitarla vuelve a regir su horario;
        las citas ya agendadas no se tocan.
      </p>
      {error && <p className="mt-3 text-sm text-terra">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await quitarHabilitacion(franja.id);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              router.refresh();
              onCerrar();
            })
          }
          className="bg-terra px-5 py-2.5 text-sm text-paper disabled:opacity-60"
        >
          {pending ? "Quitando…" : "Quitar horas habilitadas"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-clay underline underline-offset-2">
          Cerrar
        </button>
      </div>
    </Ventana>
  );
}
