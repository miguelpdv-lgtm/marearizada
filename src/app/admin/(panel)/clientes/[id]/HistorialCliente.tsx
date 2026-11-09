"use client";

import { useState } from "react";

import { Badge } from "@/components/admin/ui";
import { CitaDetalle, type CitaEditable } from "../../agenda/CitaDetalle";
import { ETIQUETA, TONO } from "../../agenda/estado";
import type { Lookups } from "../../agenda/ReservaForm";
import { formatCOP, formatDate } from "@/lib/format";

export type CitaCliente = CitaEditable & { ciudad: string; profesional: string | null };

/** Historial de reservas de un cliente: cada fila abre el mismo modal de
 * edición completa que usa la agenda, para no tener dos formularios
 * distintos para lo mismo. */
export function HistorialCliente({ citas, lookups }: { citas: CitaCliente[]; lookups: Lookups }) {
  const [citaAbierta, setCitaAbierta] = useState<CitaCliente | null>(null);

  return (
    <>
      <div className="divide-y divide-stone border border-stone bg-white">
        {citas.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCitaAbierta(c)}
            className="flex w-full flex-col gap-2 p-5 text-left transition-colors hover:bg-[#effbfb] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {c.firstVisit && "★ "}
                {formatDate(c.date)} · {c.servicio}
              </p>
              <p className="t-small mt-0.5">
                {c.ciudad}
                {c.profesional && ` · ${c.profesional}`}
                {` · ${c.code}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-ink">{formatCOP(c.priceOverride ?? c.servicePrice)}</span>
              <Badge tone={TONO[c.status] ?? "neutral"}>{ETIQUETA[c.status] ?? c.status}</Badge>
            </div>
          </button>
        ))}
      </div>

      <CitaDetalle
        key={citaAbierta?.id}
        cita={citaAbierta}
        lookups={lookups}
        onClose={() => setCitaAbierta(null)}
      />
    </>
  );
}
