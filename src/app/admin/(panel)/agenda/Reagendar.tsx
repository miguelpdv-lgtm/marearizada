"use client";

import { useEffect, useState, useTransition } from "react";

import { horasParaReagendar, reagendarCita } from "./actions";

const hora12 = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  const sufijo = hh >= 12 ? "p.m." : "a.m.";
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${sufijo}`;
};

/**
 * Mover una cita a otro día u hora sin abrir el formulario completo: se elige
 * el día, se ven las horas libres (con la duración real de la cita) y se
 * guarda. También se puede escribir una hora a mano, por si el salón decide
 * atender fuera de la grilla.
 */
export function Reagendar({
  citaId,
  fechaActual,
  horaActual,
  onListo,
}: {
  citaId: string;
  fechaActual: string;
  horaActual: string;
  onListo: () => void;
}) {
  const [fecha, setFecha] = useState(fechaActual);
  const [hora, setHora] = useState("");
  const [libres, setLibres] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, startCarga] = useTransition();
  const [guardando, startGuardar] = useTransition();

  useEffect(() => {
    setHora("");
    setAviso(null);
    setError(null);
    startCarga(async () => {
      setLibres(await horasParaReagendar(citaId, fecha));
    });
  }, [citaId, fecha]);

  const guardar = (confirmar = false) => {
    setError(null);
    startGuardar(async () => {
      const r = await reagendarCita(citaId, fecha, hora, confirmar);
      if ("warning" in r) {
        setAviso(r.message);
        return;
      }
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onListo();
    });
  };

  return (
    <div className="space-y-4">
      <p className="t-small">
        Hoy está para el <strong className="text-ink">{fechaActual}</strong> a las{" "}
        <strong className="text-ink">{hora12(horaActual)}</strong>.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Nuevo día</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="admin-control px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Hora</span>
          <input
            type="time"
            step={300}
            value={hora}
            onChange={(e) => {
              setHora(e.target.value);
              setAviso(null);
            }}
            className="admin-control px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">
          {cargando
            ? "Buscando horas libres…"
            : libres && libres.length > 0
              ? "Horas libres ese día:"
              : "No hay horas libres ese día con la duración de esta cita. Puedes escribir una hora a mano."}
        </p>
        {!cargando && libres && libres.length > 0 && (
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {libres.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setHora(h);
                  setAviso(null);
                }}
                className={`border px-2.5 py-1.5 text-xs transition-colors ${
                  hora === h
                    ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]"
                    : "border-stone bg-white text-ink hover:border-marea"
                }`}
              >
                {hora12(h)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-terra">{error}</p>}
      {aviso && (
        <div className="border border-terra/40 bg-terra/5 px-4 py-3 text-sm text-ink">
          {aviso}
          <button
            type="button"
            onClick={() => guardar(true)}
            disabled={guardando}
            className="mt-2 block text-xs font-semibold text-marea underline underline-offset-2"
          >
            Reagendar igual
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => guardar()}
        disabled={!hora || guardando}
        className="btn btn-primary px-5 py-3 text-sm"
      >
        {guardando ? "Guardando…" : hora ? `Mover al ${fecha} · ${hora12(hora)}` : "Elige una hora"}
      </button>
    </div>
  );
}
