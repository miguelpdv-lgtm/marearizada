"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { reagendarCita } from "./actions";

/*
 * Mover citas arrastrándolas en la agenda: se agarra la tarjeta, se ve un
 * fantasma con la nueva hora mientras se mueve y al soltar se confirma.
 * Funciona en cualquier rejilla cuyas columnas lleven `data-col` (el id de
 * la profesional o el día) y midan de `desdeMin` a `hastaMin`.
 */

/** Paso del arrastre: 5 minutos, para poder dejar citas en 10:20 o 10:50. */
const PASO = 5;
/** Lo que hay que mover el puntero para que cuente como arrastre y no como clic. */
const UMBRAL_PX = 6;

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const hora12 = (min: number) => {
  const h = Math.floor(min / 60);
  return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, "0")} ${h >= 12 ? "p.m." : "a.m."}`;
};

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fechaCorta = (f: string) => {
  const [a, m, d] = f.split("-").map(Number);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}/${m}`;
};

/** Solo se mueven las citas abiertas: ni canceladas ni ya atendidas. */
export const sePuedeMover = (status: string) => status === "PENDIENTE" || status === "CONFIRMADA";

export type Fantasma = {
  citaId: string;
  /** Columna donde caería (`data-col`). */
  col: string;
  inicioMin: number;
  finMin: number;
};

type CitaArrastrable = { id: string; status: string; inicioMin: number; finMin: number };

export function useArrastreCita({
  desdeMin,
  hastaMin,
  colDe,
  onSoltar,
  onEmpezar,
}: {
  desdeMin: number;
  hastaMin: number;
  /** Columna en la que está hoy la cita. */
  colDe: (citaId: string) => string;
  onSoltar: (f: Fantasma) => void;
  /** Al arrancar el arrastre (p. ej. para esconder el tooltip). */
  onEmpezar?: () => void;
}) {
  const [fantasma, setFantasmaEstado] = useState<Fantasma | null>(null);
  // Copia síncrona para leerla al soltar sin esperar el render.
  const ultimo = useRef<Fantasma | null>(null);
  const setFantasma = (f: Fantasma | null) => {
    ultimo.current = f;
    setFantasmaEstado(f);
  };
  const agarre = useRef<{ x: number; y: number; cita: CitaArrastrable; offset: number | null } | null>(null);
  const arrastrando = useRef(false);
  // El clic que llega justo después de soltar no debe abrir el detalle.
  const tragarClic = useRef(false);

  const columnaEn = (x: number, y: number) =>
    document
      .elementsFromPoint(x, y)
      .find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.col !== undefined);

  const minutoEn = (col: HTMLElement, y: number) => {
    const r = col.getBoundingClientRect();
    return desdeMin + ((y - r.top) / r.height) * (hastaMin - desdeMin);
  };

  const props = (cita: CitaArrastrable) => {
    if (!sePuedeMover(cita.status)) return {};
    return {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        agarre.current = { x: e.clientX, y: e.clientY, cita, offset: null };
        arrastrando.current = false;
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const a = agarre.current;
        if (!a || a.cita.id !== cita.id) return;
        if (!arrastrando.current) {
          if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < UMBRAL_PX) return;
          arrastrando.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onEmpezar?.();
        }
        const col = columnaEn(e.clientX, e.clientY);
        if (!col) return;
        // Se conserva el punto de la tarjeta por el que se agarró.
        if (a.offset === null) a.offset = minutoEn(col, a.y) - cita.inicioMin;
        const dur = cita.finMin - cita.inicioMin;
        const crudo = minutoEn(col, e.clientY) - a.offset;
        const ini = Math.max(desdeMin, Math.min(hastaMin - PASO, Math.round(crudo / PASO) * PASO));
        setFantasma({ citaId: cita.id, col: col.dataset.col!, inicioMin: ini, finMin: ini + dur });
      },
      onPointerUp: () => {
        const a = agarre.current;
        agarre.current = null;
        if (!a || !arrastrando.current) return;
        arrastrando.current = false;
        tragarClic.current = true;
        const f = ultimo.current;
        // Soltarla donde estaba no hace nada; si no, queda el fantasma
        // mientras se confirma.
        if (f && (f.col !== colDe(cita.id) || f.inicioMin !== cita.inicioMin)) onSoltar(f);
        else setFantasma(null);
      },
      onPointerCancel: () => {
        agarre.current = null;
        arrastrando.current = false;
        setFantasma(null);
      },
      onClickCapture: (e: React.MouseEvent) => {
        if (tragarClic.current) {
          tragarClic.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      },
      style: { cursor: "grab", touchAction: "none" as const },
    };
  };

  return { fantasma, limpiar: () => setFantasma(null), props };
}

/** El bloque translúcido con la nueva hora mientras se arrastra. */
export function FantasmaCita({
  f,
  titulo,
  top,
  height,
}: {
  f: Fantasma;
  titulo: string;
  top: string;
  height: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-ink/60 bg-sky-pale/80 shadow-lg"
      style={{ top, height, minHeight: 22 }}
    >
      <span className="block px-1.5 pt-0.5 font-mono text-[11px] font-semibold text-ink">
        {aHora(f.inicioMin)} – {aHora(f.finMin)}
      </span>
      <span className="block truncate px-1.5 text-[11px] text-ink/80">{titulo}</span>
    </div>
  );
}

/**
 * Confirmar el movimiento. Si choca con otra cita o un bloqueo, se avisa y se
 * puede mover igual. El correo a la clienta es opcional (va marcado si cambia
 * la hora).
 */
export function ConfirmarMovimiento({
  citaId,
  cliente,
  servicio,
  fecha,
  antes,
  despues,
  onCerrar,
}: {
  citaId: string;
  cliente: string;
  servicio: string;
  /** Día de destino, "YYYY-MM-DD". */
  fecha: string;
  antes: { profesional: { id: string | null; name: string } | null; inicioMin: number; fecha: string };
  despues: { profesional: { id: string; name: string } | null; inicioMin: number; finMin: number };
  /** Cierra la ventana; `movida` trae el id de la cita si se guardó. */
  onCerrar: (movida: string | null) => void;
}) {
  const router = useRouter();
  const cambiaHora = despues.inicioMin !== antes.inicioMin || fecha !== antes.fecha;
  const cambiaProfesional = despues.profesional && despues.profesional.id !== antes.profesional?.id;
  const [avisar, setAvisar] = useState(cambiaHora);
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState<{
    fecha: string;
    hora: string;
    horaFin?: string;
    profesional?: string | null;
    avisada?: boolean;
  } | null>(null);

  const mover = (confirmar: boolean) =>
    startTransition(async () => {
      setError(null);
      const r = await reagendarCita(citaId, fecha, aHora(despues.inicioMin), confirmar, {
        staffId: despues.profesional?.id,
        avisar,
      });
      if ("warning" in r) {
        setConflicto(r.message);
        return;
      }
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      setGuardado(r);
    });

  const cerrar = () => onCerrar(guardado ? citaId : null);

  // Confirmación visible de lo que quedó guardado (leído de la base).
  if (guardado) {
    const [hh, mm] = guardado.hora.split(":").map(Number);
    const fin = guardado.horaFin?.split(":").map(Number);
    return (
      <div
        role="presentation"
        onClick={cerrar}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cambios guardados"
          onClick={(e) => e.stopPropagation()}
          className="admin-card w-full max-w-sm bg-paper p-5 shadow-xl"
        >
          <div className="mb-4 flex items-center gap-3 border border-emerald-600/40 bg-emerald-50 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-paper">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Cambios guardados</p>
              <p className="text-xs text-emerald-800">La cita ya quedó así en la agenda.</p>
            </div>
          </div>
          <p className="t-small mb-3">
            {cliente} · {servicio}
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Día</dt>
              <dd className="text-right text-ink">{fechaCorta(guardado.fecha)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Hora</dt>
              <dd className="text-right font-semibold text-ink">
                {hora12(hh * 60 + mm)}
                {fin && <span className="font-normal text-muted"> a {hora12(fin[0] * 60 + fin[1])}</span>}
              </dd>
            </div>
            {guardado.profesional !== undefined && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Profesional</dt>
                <dd className="text-right text-ink">{guardado.profesional ?? "Sin asignar"}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Correo a la clienta</dt>
              <dd className="text-right text-ink">{guardado.avisada ? "Enviado" : "No se envió"}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={cerrar}
            autoFocus
            className="mt-5 btn btn-primary px-5 py-3 text-sm"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      onClick={() => cerrar()}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mover cita"
        onClick={(e) => e.stopPropagation()}
        className="admin-card w-full max-w-sm bg-paper p-5 shadow-xl"
      >
        <h2 className="t-card mb-1 text-lg text-ink">Mover cita</h2>
        <p className="t-small mb-4">
          {cliente} · {servicio}
        </p>

        <dl className="space-y-2 text-sm">
          {fecha !== antes.fecha && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Día</dt>
              <dd className="text-right text-ink">
                <span className="text-muted line-through">{fechaCorta(antes.fecha)}</span> →{" "}
                <strong>{fechaCorta(fecha)}</strong>
              </dd>
            </div>
          )}
          {cambiaHora && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Hora</dt>
              <dd className="text-right text-ink">
                <span className="text-muted line-through">{hora12(antes.inicioMin)}</span> →{" "}
                <strong>{hora12(despues.inicioMin)}</strong>
                <span className="text-muted"> a {hora12(despues.finMin)}</span>
              </dd>
            </div>
          )}
          {cambiaProfesional && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Profesional</dt>
              <dd className="text-right text-ink">
                {antes.profesional && (
                  <>
                    <span className="text-muted line-through">{antes.profesional.name}</span> →{" "}
                  </>
                )}
                <strong>{despues.profesional!.name}</strong>
              </dd>
            </div>
          )}
        </dl>

        {cambiaHora && (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={avisar}
              onChange={(e) => setAvisar(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-marea"
            />
            <span className="text-sm text-ink">Avisarle a la clienta por correo</span>
          </label>
        )}

        {conflicto && (
          <p className="mt-4 border border-terra/40 bg-terra/5 px-3 py-2 text-sm text-terra">
            {conflicto} ¿Moverla igual?
          </p>
        )}
        {error && <p className="mt-4 text-sm text-terra">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => mover(Boolean(conflicto))}
            className="btn btn-primary px-5 py-3 text-sm"
          >
            {pending ? "Moviendo…" : conflicto ? "Mover igual" : "Mover"}
          </button>
          <button
            type="button"
            onClick={() => cerrar()}
            className="text-xs text-clay underline underline-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
