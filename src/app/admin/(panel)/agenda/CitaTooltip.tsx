"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/admin/ui";
import { ETIQUETA, TONO } from "./estado";

/**
 * Tooltip con el detalle completo de una cita, para mostrar al pasar el
 * mouse sobre un bloque del calendario (semana o profesionales). Se
 * renderiza en un portal directo a `<body>` con `position: fixed`, así
 * queda por encima de todo (sidebar, otras columnas, el propio contenedor
 * con scroll horizontal) y nunca se corta por `overflow-x-auto`.
 */

type Hover = { top: number; left: number; placement: "top" | "bottom" };

/** Rastrea qué elemento tiene el mouse encima y en qué posición de
 * pantalla está, para poder anclar el tooltip ahí vía portal. */
export function useCitaHover<T>() {
  const [hover, setHover] = useState<{ item: T } & Hover>();

  const onEnter = (item: T) => (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // Si no hay espacio arriba (bloques del inicio del día), se muestra abajo.
    const placement: "top" | "bottom" = r.top > 190 ? "top" : "bottom";
    setHover({
      item,
      top: placement === "top" ? r.top : r.bottom,
      left: r.left + r.width / 2,
      placement,
    });
  };

  const onLeave = () => setHover(undefined);

  return { hover, onEnter, onLeave };
}

export function TooltipPortal({ top, left, placement, children }: Hover & { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;

  const ancho = typeof window !== "undefined" ? window.innerWidth : 1280;
  const leftClamp = Math.min(Math.max(left, 130), ancho - 130);

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] transition-opacity"
      style={{
        top,
        left: leftClamp,
        transform: `translate(-50%, ${placement === "top" ? "calc(-100% - 8px)" : "8px"})`,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Lo que hace falta de una cita para el tooltip, además de las filas. */
export type DetalleTooltip = {
  clientEmail?: string | null;
  servicePrice: number;
  priceOverride: number | null;
  depositPaid?: number;
  notes?: string | null;
  internalNotes?: string | null;
  items: { id: string; name: string; quantity: number; unitPrice: number; staffName?: string | null }[];
};

const pesos = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

export function CitaTooltip({
  titulo,
  subtitulo,
  estado,
  filas,
  detalle,
}: {
  titulo: string;
  subtitulo?: string;
  estado: string;
  filas: { label: string; value: string }[];
  /** Lo vendido, el valor, el abono y las notas de la cita. */
  detalle?: DetalleTooltip;
}) {
  const precioServicio = detalle ? (detalle.priceOverride ?? detalle.servicePrice) : 0;
  const total = detalle
    ? precioServicio + detalle.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
    : 0;

  return (
    <div className="w-72 rounded-lg border border-stone bg-white p-3 text-left shadow-xl">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{titulo}</p>
        <Badge tone={TONO[estado] ?? "neutral"}>{ETIQUETA[estado] ?? estado}</Badge>
      </div>
      {subtitulo && <p className="t-small -mt-1 mb-1.5 truncate">{subtitulo}</p>}
      <dl className="space-y-1">
        {filas.map((f) => (
          <div key={f.label} className="flex justify-between gap-3 text-xs">
            <dt className="shrink-0 text-muted">{f.label}</dt>
            <dd className="min-w-0 truncate text-right text-ink">{f.value}</dd>
          </div>
        ))}
        {detalle?.clientEmail && (
          <div className="flex justify-between gap-3 text-xs">
            <dt className="shrink-0 text-muted">Correo</dt>
            <dd className="min-w-0 truncate text-right text-ink">{detalle.clientEmail}</dd>
          </div>
        )}
      </dl>

      {detalle && (
        <div className="mt-2 space-y-1 border-t border-stone pt-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-muted">{subtitulo ?? "Servicio"}</span>
            <span className="shrink-0 text-ink">{pesos(precioServicio)}</span>
          </div>
          {detalle.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink">
                + {i.quantity > 1 ? `${i.quantity}× ` : ""}
                {i.name}
                {i.staffName && <span className="text-muted"> · {i.staffName}</span>}
              </span>
              <span className="shrink-0 text-ink">{pesos(i.unitPrice * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-semibold text-ink">
            <span>Total</span>
            <span>{pesos(total)}</span>
          </div>
          {!!detalle.depositPaid && (
            <div className="flex justify-between gap-3 text-ink">
              <span>Abonó en línea</span>
              <span>−{pesos(detalle.depositPaid)}</span>
            </div>
          )}
        </div>
      )}

      {(detalle?.notes || detalle?.internalNotes) && (
        <div className="mt-2 space-y-1 border-t border-stone pt-2 text-xs">
          {detalle.notes && (
            <p className="line-clamp-3 text-ink">
              <span className="text-muted">Nota: </span>
              {detalle.notes}
            </p>
          )}
          {detalle.internalNotes && (
            <p className="line-clamp-3 text-ink">
              <span className="text-muted">Interna: </span>
              {detalle.internalNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
