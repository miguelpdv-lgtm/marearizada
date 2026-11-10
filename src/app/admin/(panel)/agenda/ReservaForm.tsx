"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, Input, Select, Textarea } from "@/components/admin/form";
import { METODO_PAGO_LABEL, METODOS_PAGO, type MetodoPago } from "@/lib/constants";
import { ESTADOS, ETIQUETA } from "./estado";
import {
  actualizarReserva,
  crearReservaAdmin,
  staffParaServicio,
  type DatosReservaAdmin,
} from "./actions";

export type LookupSede = { id: string; city: string };
export type LookupServicio = {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  branchId: string | null;
};
export type ClienteConocido = { name: string; phone: string; email: string | null };
export type LookupProducto = { id: string; name: string; price: number };

export type Lookups = {
  sedes: LookupSede[];
  servicios: LookupServicio[];
  productos: LookupProducto[];
  clientes: ClienteConocido[];
  /** Equipo activo, para elegir quién vendió cada ítem. */
  equipo: { id: string; name: string; branchId: string | null }[];
};

export type ReservaInicial = {
  id: string;
  branchId: string;
  serviceId: string;
  staffId: string | null;
  fecha: string;
  hora: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  status: string;
  paymentMethod: string | null;
  price: number;
  notes: string | null;
  internalNotes: string | null;
};

/**
 * Formulario completo de una reserva: sirve para crear (sin `inicial`) y
 * para editar (con `inicial` precargado). Igual que el modal "Nuevo →
 * Reserva" de AgendaPro: un solo formulario para ambos casos.
 */
export function ReservaForm({
  lookups,
  inicial,
  sedePorDefecto,
  fechaPorDefecto,
  onGuardado,
  onCancelar,
}: {
  lookups: Lookups;
  inicial?: ReservaInicial;
  sedePorDefecto?: string;
  fechaPorDefecto?: string;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState(inicial?.branchId ?? sedePorDefecto ?? lookups.sedes[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(inicial?.serviceId ?? "");
  const [staffId, setStaffId] = useState(inicial?.staffId ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaPorDefecto ?? "");
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [clientName, setClientName] = useState(inicial?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(inicial?.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(inicial?.clientEmail ?? "");
  const [status, setStatus] = useState(inicial?.status ?? "PENDIENTE");
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago | "">(
    (inicial?.paymentMethod as MetodoPago | null) ?? "",
  );
  const [price, setPrice] = useState<number | "">(inicial?.price ?? "");
  const [notes, setNotes] = useState(inicial?.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(inicial?.internalNotes ?? "");

  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [cargandoStaff, setCargandoStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const serviciosDeLaSede = useMemo(
    () => lookups.servicios.filter((s) => !s.branchId || s.branchId === branchId),
    [lookups.servicios, branchId],
  );
  const servicioElegido = useMemo(
    () => serviciosDeLaSede.find((s) => s.id === serviceId),
    [serviciosDeLaSede, serviceId],
  );

  // Sede y servicio son dependientes: si cambia la sede y el servicio ya no
  // pertenece a ella, se limpia para forzar a elegir uno válido.
  useEffect(() => {
    if (serviceId && !serviciosDeLaSede.some((s) => s.id === serviceId)) {
      setServiceId("");
    }
  }, [branchId, serviceId, serviciosDeLaSede]);

  // El precio por defecto sigue al servicio elegido, salvo que ya se haya
  // precargado uno (edición) — solo se resetea cuando el usuario cambia de
  // servicio explícitamente.
  useEffect(() => {
    if (servicioElegido) setPrice(servicioElegido.price);
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setWarning(null);
    if (!branchId || !serviceId) {
      setStaffOptions([]);
      return;
    }
    setCargandoStaff(true);
    staffParaServicio(branchId, serviceId)
      .then((res) => {
        setStaffOptions(res);
        if (staffId && !res.some((s) => s.id === staffId)) setStaffId("");
      })
      .finally(() => setCargandoStaff(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, serviceId]);

  const clienteConocido = useMemo(() => {
    const tel = clientPhone.replace(/\D/g, "");
    if (tel.length < 10) return null;
    return lookups.clientes.find((c) => c.phone.replace(/\D/g, "") === tel) ?? null;
  }, [clientPhone, lookups.clientes]);

  const aplicarClienteConocido = () => {
    if (!clienteConocido) return;
    setClientName(clienteConocido.name);
    if (clienteConocido.email) setClientEmail(clienteConocido.email);
  };

  const construirDatos = (confirmar: boolean): DatosReservaAdmin => ({
    branchId,
    serviceId,
    staffId: staffId || undefined,
    fecha,
    hora,
    clientName,
    clientPhone,
    clientEmail: clientEmail || undefined,
    status: status as (typeof ESTADOS)[number],
    paymentMethod: paymentMethod || undefined,
    price: price === "" ? undefined : price,
    notes: notes || undefined,
    internalNotes: internalNotes || undefined,
    confirmar,
  });

  const guardar = (confirmar: boolean) => {
    setError(null);
    startTransition(async () => {
      const datos = construirDatos(confirmar);
      const resultado = inicial
        ? await actualizarReserva(inicial.id, datos)
        : await crearReservaAdmin(datos);

      if ("warning" in resultado) {
        setWarning(resultado.message);
        return;
      }
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setWarning(null);
      router.refresh();
      onGuardado();
    });
  };

  const horaFin = useMemo(() => {
    if (!hora || !servicioElegido) return null;
    const [h, m] = hora.split(":").map(Number);
    const total = h * 60 + m + servicioElegido.durationMin;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [hora, servicioElegido]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar(false);
      }}
      className="space-y-5"
    >
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {warning && (
        <div className="space-y-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{warning}</p>
          <button
            type="button"
            onClick={() => guardar(true)}
            disabled={pending}
            className="text-xs font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            Guardar de todas formas
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Con un solo local no se pregunta. */}
        {lookups.sedes.length > 1 && (
          <Field label="Local" name="branchId" required>
            <Select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
              <option value="">Elige un local</option>
              {lookups.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.city}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Servicio" name="serviceId" required>
          <Select
            name="serviceId"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            disabled={!branchId}
          >
            <option value="">Elige un servicio</option>
            {serviciosDeLaSede.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Profesional"
        name="staffId"
        hint={cargandoStaff ? "Buscando quién hace este servicio…" : undefined}
      >
        <Select name="staffId" value={staffId} onChange={(e) => setStaffId(e.target.value)} disabled={!serviceId}>
          <option value="">Sin asignar</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" name="fecha" required>
          <Input type="date" name="fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
        <Field label="Hora" name="hora" required hint={horaFin ? `Termina a las ${horaFin}` : undefined}>
          <Input
            type="time"
            name="hora"
            step={900}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la clienta" name="clientName" required>
          <Input
            name="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Celular"
          name="clientPhone"
          required
          hint={clienteConocido ? `Ya la conocemos: ${clienteConocido.name}` : undefined}
        >
          <Input
            name="clientPhone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            onBlur={aplicarClienteConocido}
            list="clientes-conocidos"
            required
          />
          <datalist id="clientes-conocidos">
            {lookups.clientes.map((c) => (
              <option key={c.phone} value={c.phone}>
                {c.name}
              </option>
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo (opcional)" name="clientEmail">
          <Input
            type="email"
            name="clientEmail"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </Field>
        <Field label="Precio (COP)" name="price">
          <Input
            type="number"
            name="price"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado" name="status" required>
          <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)} required>
            {ESTADOS.filter(
              (e) => (e !== "ATENDIDA" && e !== "POR_PAGAR") || inicial?.status === e,
            ).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA[e]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Método de pago"
          name="paymentMethod"
          hint="Opcional. Cómo se cobró la cita al final."
        >
          <Select
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as MetodoPago | "")}
          >
            <option value="">Sin especificar</option>
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {METODO_PAGO_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Nota compartida con la clienta" name="notes" hint="Va en el recordatorio, si lo hay.">
        <Textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Field label="Nota interna" name="internalNotes" hint="Solo la ve el equipo, nunca la clienta.">
        <Textarea
          name="internalNotes"
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone/70 pt-5">
        <button type="submit" disabled={pending} className="btn btn-primary disabled:cursor-wait disabled:opacity-60">
          {pending ? "Guardando…" : inicial ? "Guardar cambios" : "Crear reserva"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-3 text-sm text-muted transition-colors hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
