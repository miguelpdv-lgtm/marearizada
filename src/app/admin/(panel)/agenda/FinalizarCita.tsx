"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { METODO_PAGO_LABEL, METODOS_PAGO, type MetodoPago } from "@/lib/constants";
import { formatCOP } from "@/lib/format";
import { finalizarCita, reabrirCita } from "./actions";
import type { ItemDTO } from "./items-actions";

/**
 * "Hasta aquí llegó": cierra la visita. Muestra todo lo que se le hizo y se
 * le vendió, deja ajustar el precio final del servicio principal (los de
 * precio variable, como el blower, dependen del largo), descuenta el abono y
 * pide el medio de pago. Al confirmar se genera la venta, la
 * cita queda atendida y ya no se le puede sumar nada sin reabrirla.
 */
export function FinalizarCita({
  citaId,
  estado,
  servicio,
  precioLista,
  precioActual,
  metodoPagoActual,
  abono,
  items,
  onListo,
}: {
  citaId: string;
  estado: string;
  servicio: string;
  /** Precio del servicio en el catálogo. */
  precioLista: number;
  /** Precio que tiene hoy la cita (ajustado o el de lista). */
  precioActual: number;
  metodoPagoActual: string | null;
  abono: number;
  items: ItemDTO[];
  onListo: () => void;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [precio, setPrecio] = useState(String(precioActual));
  const [metodo, setMetodo] = useState<MetodoPago | "">((metodoPagoActual as MetodoPago) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const precioServicio = Math.max(0, Math.round(Number(precio) || 0));
  const adicionales = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
  const total = precioServicio + adicionales;
  const porCobrar = Math.max(0, total - abono);

  if (estado === "CANCELADA") return null;

  if (estado === "ATENDIDA") {
    return (
      <div className="border border-ink bg-cream px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Cita finalizada · venta registrada</p>
            <p className="t-small">
              Total {formatCOP(precioActual + adicionales)}
              {abono > 0 && <> · abonó {formatCOP(abono)}</>}
              {metodoPagoActual && (
                <> · {METODO_PAGO_LABEL[metodoPagoActual as MetodoPago] ?? metodoPagoActual}</>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await reabrirCita(citaId);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                router.refresh();
                onListo();
              })
            }
            className="text-xs text-terra underline underline-offset-2 disabled:opacity-60"
          >
            Reabrir para corregir
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-terra">{error}</p>}
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full bg-ink px-5 py-3 text-sm font-semibold tracking-[0.06em] text-gold-500 uppercase transition-opacity hover:opacity-90"
      >
        Finalizar cita
      </button>
    );
  }

  return (
    <div className="space-y-4 border-2 border-ink bg-white px-4 py-4">
      <p className="text-xs tracking-[0.12em] text-muted uppercase">Finalizar y cobrar</p>

      <ul className="divide-y divide-stone border border-stone text-sm">
        <li className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-ink">{servicio}</span>
            {precioServicio !== precioLista && (
              <span className="t-small">Precio de lista {formatCOP(precioLista)}</span>
            )}
          </span>
          <label className="flex shrink-0 items-center gap-1">
            <span className="t-small">$</span>
            <input
              type="number"
              min={0}
              aria-label="Precio final del servicio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-28 border border-stone bg-white px-2 py-1 text-right text-sm text-ink focus:border-terra focus:outline-none"
            />
          </label>
        </li>
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate text-ink">
              {i.quantity > 1 ? `${i.quantity}× ` : ""}
              {i.name}
            </span>
            <span className="shrink-0 text-ink">{formatCOP(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between px-3 py-2 font-semibold text-ink">
          <span>Total</span>
          <span>{formatCOP(total)}</span>
        </li>
        {abono > 0 && (
          <>
            <li className="flex justify-between px-3 py-2 text-ink">
              <span>Abonó en línea</span>
              <span>−{formatCOP(abono)}</span>
            </li>
            <li className="flex justify-between px-3 py-2 font-semibold text-ink">
              <span>Por cobrar</span>
              <span>{formatCOP(porCobrar)}</span>
            </li>
          </>
        )}
      </ul>

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">¿Cómo pagó?</span>
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPago | "")}
          className="admin-control px-3 py-2 text-sm"
        >
          <option value="">Sin especificar</option>
          {METODOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {METODO_PAGO_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      <p className="t-small">
        Al finalizar se registra la venta con todo lo de la cita.
      </p>

      {error && <p className="text-sm text-terra">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await finalizarCita(citaId, {
                precioServicio,
                metodoPago: metodo || undefined,
              });
              if (!r.ok) {
                setError(r.error);
                return;
              }
              router.refresh();
              onListo();
            })
          }
          className="bg-ink px-5 py-2.5 text-sm text-gold-500 disabled:opacity-60"
        >
          {pending ? "Finalizando…" : `Finalizar · ${formatCOP(abono > 0 ? porCobrar : total)}`}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-clay underline underline-offset-2"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
