"use client";

import { useState } from "react";

import { ReservaForm, type Lookups } from "./ReservaForm";

/** Botón "+ Nueva reserva" de la barra de la agenda — abre el mismo
 * formulario que la edición, vacío. Equivalente a "Nuevo → Reserva" de
 * AgendaPro. */
export function NuevaReservaButton({
  lookups,
  sedePorDefecto,
  fechaPorDefecto,
}: {
  lookups: Lookups;
  sedePorDefecto?: string;
  fechaPorDefecto: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-dark rounded-lg px-4 py-2 text-[11px]"
      >
        + Nueva reserva
      </button>

      {abierto && (
        <div
          role="presentation"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nueva reserva"
            onClick={(e) => e.stopPropagation()}
            className="admin-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-paper p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
               <h2 className="t-card text-xl text-ink">Nueva reserva</h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone text-ink transition-colors hover:border-terra"
              >
                ✕
              </button>
            </div>

            <ReservaForm
              lookups={lookups}
              sedePorDefecto={sedePorDefecto}
              fechaPorDefecto={fechaPorDefecto}
              onGuardado={() => setAbierto(false)}
              onCancelar={() => setAbierto(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
