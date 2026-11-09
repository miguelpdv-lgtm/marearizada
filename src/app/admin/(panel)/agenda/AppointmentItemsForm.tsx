"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatCOP } from "@/lib/format";
import {
  agregarProductoACita,
  agregarServicioACita,
  cambiarPrecioItemCita,
  quitarItemCita,
  type ItemDTO,
} from "./items-actions";
import type { Lookups } from "./ReservaForm";
import { BuscadorCatalogo, type OpcionCatalogo } from "@/components/admin/BuscadorCatalogo";

/** Colombia no tiene horario de verano: mismo desfase fijo que usa
 * `horaBogota()` en src/lib/agenda.ts (server-only, no se puede importar
 * desde un componente cliente). */
const OFFSET_BOGOTA = -5;
const aHora = (iso: string) => {
  const local = new Date(new Date(iso).getTime() + OFFSET_BOGOTA * 3600_000);
  return local.toISOString().slice(11, 16);
};

/** Sección de "vender dentro de la cita": servicios adicionales (ocupan
 * tiempo real — se revisa disponibilidad) y productos (descuentan stock). */
export function AppointmentItemsForm({
  appointmentId,
  branchId,
  initialItems,
  initialEndsAt,
  lookups,
  staffIdCita,
  bloqueado = false,
  onItemsChange,
}: {
  appointmentId: string;
  branchId: string;
  /** Profesional de la cita: queda preseleccionada como quien vende. */
  staffIdCita?: string | null;
  initialItems: ItemDTO[];
  /** `endsAt` actual de la cita (ISO), en UTC. */
  initialEndsAt: string;
  lookups: Lookups;
  /** Cita finalizada: se ve lo vendido pero no se cambia. */
  bloqueado?: boolean;
  /** Avisa los ítems actuales, para el resumen de "Finalizar". */
  onItemsChange?: (items: ItemDTO[]) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [items, setItems] = useState(initialItems);
  const [endsAt, setEndsAt] = useState(initialEndsAt);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ message: string; serviceId: string } | null>(null);

  const [warningStaff, setWarningStaff] = useState("");

  const opciones = useMemo<OpcionCatalogo[]>(
    () => [
      ...lookups.servicios
        .filter((s) => !s.branchId || s.branchId === branchId)
        .map((s) => ({
          kind: "SERVICE" as const,
          id: s.id,
          name: s.name,
          price: s.price,
          durationMin: s.durationMin,
        })),
      ...lookups.productos.map((p) => ({
        kind: "PRODUCT" as const,
        id: p.id,
        name: p.name,
        price: p.price,
      })),
    ],
    [lookups.servicios, lookups.productos, branchId],
  );

  const equipoDeLaSede = useMemo(
    () => lookups.equipo.filter((p) => !p.branchId || p.branchId === branchId),
    [lookups.equipo, branchId],
  );

  /** Aplica un resultado exitoso al estado local; devuelve si lo fue. */
  const aplicar = (r: { ok: true; items: ItemDTO[]; endsAt: string } | { ok: false; error: string }) => {
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setItems(r.items);
    onItemsChange?.(r.items);
    setEndsAt(r.endsAt);
    setError(null);
    setWarning(null);
    router.refresh();
    return true;
  };

  const agregarServicio = (serviceId: string, staffId: string, confirmar: boolean) => {
    setError(null);
    startTransition(async () => {
      const r = await agregarServicioACita(appointmentId, serviceId, confirmar, staffId || undefined);
      if ("warning" in r) {
        setWarning({ message: r.message, serviceId });
        setWarningStaff(staffId);
        return;
      }
      aplicar(r);
    });
  };

  const agregarProducto = (productId: string, quantity: number, staffId: string) => {
    setError(null);
    startTransition(async () => {
      const r = await agregarProductoACita(appointmentId, productId, quantity, staffId || undefined);
      if ("warning" in r) return; // nunca ocurre para productos, pero satisface el tipo
      aplicar(r);
    });
  };

  const cambiarPrecio = (itemId: string, precio: number) => {
    setError(null);
    startTransition(async () => {
      const r = await cambiarPrecioItemCita(appointmentId, itemId, precio);
      if ("warning" in r) return;
      aplicar(r);
    });
  };

  const quitar = (itemId: string) => {
    setError(null);
    startTransition(async () => {
      const r = await quitarItemCita(appointmentId, itemId);
      if ("warning" in r) return; // nunca ocurre al quitar, pero satisface el tipo
      aplicar(r);
    });
  };

  const total = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="divide-y divide-stone border border-stone">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">
                  {it.quantity > 1 ? `${it.quantity}× ` : ""}
                  {it.name}
                </p>
                <p className="t-small">
                  {it.kind === "SERVICE" ? "Servicio adicional" : "Producto"}
                  {(it.kind === "PRODUCT" || bloqueado) && <> · {formatCOP(it.unitPrice * it.quantity)}</>}
                  {it.staffName && <> · vendió {it.staffName}</>}
                </p>
              </div>
              {!bloqueado && (
                <div className="flex shrink-0 items-center gap-3">
                  {/* El precio de un servicio se ajusta acá: los de precio
                      variable ("desde…") se cobran según el caso. */}
                  {it.kind === "SERVICE" && (
                    <PrecioEditable
                      valor={it.unitPrice}
                      disabled={pending}
                      onGuardar={(v) => cambiarPrecio(it.id, v)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => quitar(it.id)}
                    disabled={pending}
                    className="text-xs text-clay underline underline-offset-2 hover:text-marea disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs text-muted">Termina a las {aHora(endsAt)}</p>
            <p className="text-sm text-ink">Adicionales: {formatCOP(total)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {warning && (
        <div className="space-y-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{warning.message}</p>
          <button
            type="button"
            onClick={() => agregarServicio(warning.serviceId, warningStaff, true)}
            disabled={pending}
            className="text-xs font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            Agregar de todas formas
          </button>
        </div>
      )}

      {!bloqueado && (
      <BuscadorCatalogo
        opciones={opciones}
        equipo={equipoDeLaSede}
        profesionalInicial={staffIdCita ?? ""}
        disabled={pending}
        onAgregar={(o, cantidad, staffId) => {
          if (o.kind === "SERVICE") agregarServicio(o.id, staffId, false);
          else agregarProducto(o.id, cantidad, staffId);
        }}
      />
      )}
    </div>
  );
}

/** Precio en pesos que se guarda al salir de la casilla o con Enter. */
export function PrecioEditable({
  valor,
  disabled,
  onGuardar,
}: {
  valor: number;
  disabled?: boolean;
  onGuardar: (v: number) => void;
}) {
  const [texto, setTexto] = useState(String(valor));
  const guardar = () => {
    const v = Math.round(Number(texto));
    if (!Number.isFinite(v) || v < 0) {
      setTexto(String(valor));
      return;
    }
    if (v !== valor) onGuardar(v);
  };
  return (
    <label className="flex items-center gap-1">
      <span className="t-small">$</span>
      <input
        type="number"
        min={0}
        aria-label="Precio"
        value={texto}
        disabled={disabled}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            guardar();
          }
        }}
        className="w-24 border border-stone bg-white px-2 py-1 text-right text-sm text-ink focus:border-marea focus:outline-none disabled:opacity-60"
      />
    </label>
  );
}
