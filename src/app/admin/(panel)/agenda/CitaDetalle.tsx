"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/admin/ui";
import { formatCOP } from "@/lib/format";
import { METODO_PAGO_LABEL, METODOS_PAGO } from "@/lib/constants";
import { actualizarEstado } from "./actions";
import { AppointmentItemsForm } from "./AppointmentItemsForm";
import type { ItemDTO } from "./items-actions";
import { ETIQUETA, TONO } from "./estado";
import { ReservaForm, type Lookups } from "./ReservaForm";
import { DatosCliente } from "./DatosCliente";
import { Reagendar } from "./Reagendar";
import { FinalizarCita } from "./FinalizarCita";

/** Lo que necesita el detalle/edición completa de una reserva. Tanto la
 * vista semana como la de profesionales tienen citas con más campos que
 * estos (día, sede en texto, nombre del profesional…), pero esos son solo
 * para pintar el bloque en el calendario — no hacen falta acá. */
export type CitaEditable = {
  id: string;
  code: string;
  branchId: string;
  serviceId: string;
  staffId: string | null;
  /** "YYYY-MM-DD" en hora de Bogotá. */
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  internalNotes: string | null;
  servicio: string;
  servicePrice: number;
  priceOverride: number | null;
  status: string;
  paymentMethod: string | null;
  inicioMin: number;
  finMin: number;
  firstVisit: boolean;
  curlType: string | null;
  /** `endsAt` real de la cita en ISO — puede ser más tarde que `finMin`
   * sugiere si ya se le agregaron servicios adicionales. */
  endsAtIso: string;
  items: ItemDTO[];
  /** Abono pagado en línea con Bold al reservar. */
  depositPaid?: number;
};

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Detalle + edición completa de una reserva: se abre al hacer clic en un
 * bloque del calendario (semana o por profesional), en vez de navegar a
 * otra página. Arriba, un cambio de estado instantáneo (sin tocar el resto
 * del formulario); debajo, la reserva completa por si hay que reprogramarla,
 * reasignar profesional, ajustar precio, etc. */
export function CitaDetalle({
  cita,
  lookups,
  onClose,
}: {
  cita: CitaEditable | null;
  lookups: Lookups;
  onClose: () => void;
}) {
  const [estado, setEstado] = useState(cita?.status ?? "PENDIENTE");
  const [metodoPago, setMetodoPago] = useState(cita?.paymentMethod ?? "");
  const [pending, startTransition] = useTransition();
  // Lo que se le vendió en la cita, al día, para el resumen de "Finalizar".
  const [items, setItems] = useState(cita?.items ?? []);

  if (!cita) return null;
  const finalizada = estado === "ATENDIDA";

  const cambiarEstadoRapido = (nuevo: string) => {
    setEstado(nuevo);
    startTransition(async () => {
      await actualizarEstado(cita.id, nuevo, metodoPago || undefined);
    });
  };

  const cambiarMetodoPagoRapido = (nuevo: string) => {
    setMetodoPago(nuevo);
    startTransition(async () => {
      await actualizarEstado(cita.id, estado, nuevo || undefined);
    });
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reserva de ${cita.clientName}`}
        onClick={(e) => e.stopPropagation()}
        className="admin-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-paper shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone px-6 py-5">
          <div className="min-w-0">
            <p className="t-eyebrow text-clay">
              {aHora(cita.inicioMin)} – {aHora(cita.finMin)}
            </p>
            <h2 className="t-card mt-1 truncate text-xl text-ink">
              {cita.firstVisit && "★ "}
              {cita.clientName}
            </h2>
            <p className="t-small mt-0.5">{cita.servicio}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone text-ink transition-colors hover:border-terra"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-3">
            <Badge tone={TONO[estado] ?? "neutral"}>{ETIQUETA[estado] ?? estado}</Badge>
            <span className="t-small">{cita.code}</span>
            {pending && <span className="t-small text-terra">Guardando…</span>}
          </div>

          <DatosCliente
            nombre={cita.clientName}
            telefono={cita.clientPhone}
            correo={cita.clientEmail}
            primeraVez={cita.firstVisit}
            tipoRizo={cita.curlType}
            nota={cita.notes}
          />

          <FinalizarCita
            citaId={cita.id}
            estado={estado}
            servicio={cita.servicio}
            precioLista={cita.servicePrice}
            precioActual={cita.priceOverride ?? cita.servicePrice}
            metodoPagoActual={cita.paymentMethod}
            abono={cita.depositPaid ?? 0}
            items={items}
            onListo={onClose}
          />

          {!!cita.depositPaid && (
            <p className="border border-sky bg-sky-pale px-4 py-3 text-sm text-ink">
              Abonó <strong>{formatCOP(cita.depositPaid)}</strong> en línea con Bold. Descuéntalo
              al cobrar.
            </p>
          )}

          <div>
            <label htmlFor="estado-rapido" className="mb-1.5 block text-xs text-muted">
              Cambiar solo el estado
            </label>
            <select
              id="estado-rapido"
              value={estado}
              disabled={pending || finalizada}
              onChange={(e) => cambiarEstadoRapido(e.target.value)}
               className="admin-control px-3 py-2 text-sm disabled:opacity-60"
            >
              {Object.entries(ETIQUETA)
                .filter(([v]) => v !== "ATENDIDA" || estado === "ATENDIDA")
                .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="metodo-pago-rapido" className="mb-1.5 block text-xs text-muted">
              Método de pago (opcional)
            </label>
            <select
              id="metodo-pago-rapido"
              value={metodoPago}
              disabled={pending}
              onChange={(e) => cambiarMetodoPagoRapido(e.target.value)}
              className="admin-control px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">Sin especificar</option>
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {METODO_PAGO_LABEL[m]}
                </option>
              ))}
            </select>
          </div>

          <details className="border-t border-stone pt-4">
            <summary className="cursor-pointer text-xs tracking-[0.12em] text-muted uppercase">
              Reagendar
            </summary>
            <div className="mt-4">
              <Reagendar
                citaId={cita.id}
                fechaActual={cita.date}
                horaActual={aHora(cita.inicioMin)}
                onListo={onClose}
              />
            </div>
          </details>

          <details className="border-t border-stone pt-4" open={!finalizada}>
            <summary className="cursor-pointer text-xs tracking-[0.12em] text-muted uppercase">
              {finalizada ? "Lo que se vendió" : "Vender: servicios y productos adicionales"}
            </summary>
            <div className="mt-4">
              <AppointmentItemsForm
                appointmentId={cita.id}
                branchId={cita.branchId}
                initialItems={cita.items}
                initialEndsAt={cita.endsAtIso}
                lookups={lookups}
                staffIdCita={cita.staffId}
                bloqueado={finalizada}
                onItemsChange={setItems}
              />
            </div>
          </details>

          <details className="border-t border-stone pt-4">
            <summary className="cursor-pointer text-xs tracking-[0.12em] text-muted uppercase">
              Editar reserva completa
            </summary>
            <div className="mt-4">
              <ReservaForm
                lookups={lookups}
                inicial={{
                  id: cita.id,
                  branchId: cita.branchId,
                  serviceId: cita.serviceId,
                  staffId: cita.staffId,
                  fecha: cita.date,
                  hora: aHora(cita.inicioMin),
                  clientName: cita.clientName,
                  clientPhone: cita.clientPhone,
                  clientEmail: cita.clientEmail,
                  status: cita.status,
                  paymentMethod: cita.paymentMethod,
                  price: cita.priceOverride ?? cita.servicePrice,
                  notes: cita.notes,
                  internalNotes: cita.internalNotes,
                }}
                onGuardado={onClose}
                onCancelar={onClose}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
