"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, Input, Select, Textarea } from "@/components/admin/form";
import {
  BuscadorCatalogo,
  type DescuentoAlAgregar,
  type OpcionCatalogo,
} from "@/components/admin/BuscadorCatalogo";
import { METODO_PAGO_LABEL, METODOS_PAGO, type MetodoPago } from "@/lib/constants";
import { TIPOS_DOCUMENTO } from "@/lib/documentos";
import { formatCOP } from "@/lib/format";
import type { Lookups } from "../agenda/ReservaForm";
import { crearVenta } from "./actions";
import { BuscadorCliente } from "./BuscadorCliente";

type Carrito = {
  kind: "SERVICE" | "PRODUCT";
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Rebaja en pesos sobre el total de esta línea. 0 = sin descuento. */
  discount: number;
  /** Si el descuento se dio en porcentaje, cuál; así se recalcula solo al
   * cambiar la cantidad. null = se escribió en pesos. */
  descuentoPct: number | null;
  /** Profesional que vendió esta línea ("" = sin asignar). */
  staffId: string;
};

/** Una parte del pago: "$50.000 en efectivo". */
type Pago = { method: MetodoPago | ""; amount: number };

export type Profesional = { id: string; name: string; branchId: string | null };

/** Con descuento en porcentaje, los pesos salen del valor de la línea. Se
 * redondea al peso: la caja trabaja en pesos enteros. */
function conPct(c: Carrito): Carrito {
  if (c.descuentoPct == null) return c;
  return { ...c, discount: Math.round((c.unitPrice * c.quantity * c.descuentoPct) / 100) };
}

/** Venta de mostrador: mismo espíritu que ReservaForm — un formulario, sin
 * cita de por medio. El carrito vive en memoria hasta que se registra. */
export function VentaForm({ lookups, equipo }: { lookups: Lookups; equipo: Profesional[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState(lookups.sedes[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  // Vacío = sin documento, el caso normal. Solo se llena si la clienta lo da.
  const [clientDocType, setClientDocType] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  // Cliente elegido en el buscador (o "nuevo"); null = venta sin cliente.
  const [cliente, setCliente] = useState<{ nuevo: boolean } | null>(null);
  const [notes, setNotes] = useState("");
  const [carrito, setCarrito] = useState<Carrito[]>([]);
  // Con una sola parte, el valor sigue solo al total; al dividir el pago, cada
  // parte se escribe a mano.
  const [pagos, setPagos] = useState<Pago[]>([{ method: "", amount: 0 }]);
  const [error, setError] = useState<string | null>(null);

  const equipoDeLaSede = useMemo(
    () => equipo.filter((p) => !p.branchId || p.branchId === branchId),
    [equipo, branchId],
  );

  const opciones = useMemo<OpcionCatalogo[]>(
    () => [
      ...lookups.productos.map((p) => ({ kind: "PRODUCT" as const, id: p.id, name: p.name, price: p.price })),
      ...lookups.servicios
        .filter((s) => !s.branchId || s.branchId === branchId)
        .map((s) => ({
          kind: "SERVICE" as const,
          id: s.id,
          name: s.name,
          price: s.price,
          durationMin: s.durationMin,
        })),
    ],
    [lookups.productos, lookups.servicios, branchId],
  );

  const agregarAlCarrito = (
    o: OpcionCatalogo,
    quantity: number,
    staffId: string,
    descuento: DescuentoAlAgregar,
  ) => {
    const pct = descuento.tipo === "PCT" ? descuento.valor : 0;
    // Un descuento en pesos fijos se aplica a la línea entera y no puede
    // pasar de su valor.
    const pesos = descuento.tipo === "PESOS" ? Math.min(descuento.valor, o.price * quantity) : 0;
    setCarrito((prev) => {
      // Solo se suma a una línea igual si no trae descuento propio: con
      // descuentos distintos son dos cobros distintos.
      const existente =
        pesos === 0
          ? prev.find(
              (c) =>
                c.kind === o.kind &&
                c.id === o.id &&
                c.staffId === staffId &&
                (c.descuentoPct ?? 0) === pct &&
                (pct > 0 || c.discount === 0),
            )
          : undefined;
      if (existente) {
        return prev.map((c) => (c === existente ? conPct({ ...c, quantity: c.quantity + quantity }) : c));
      }
      return [
        ...prev,
        conPct({
          kind: o.kind,
          id: o.id,
          name: o.name,
          unitPrice: o.price,
          quantity,
          discount: pesos,
          descuentoPct: pct > 0 ? pct : null,
          staffId,
        }),
      ];
    });
  };

  const quitarDelCarrito = (index: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const cambiarLinea = (index: number, cambio: Partial<Carrito>) => {
    setCarrito((prev) => prev.map((c, i) => (i === index ? conPct({ ...c, ...cambio }) : c)));
  };

  // Tope en el valor de la línea: un descuento mayor dejaría un precio
  // negativo, que la contabilidad no admite.
  const cambiarDescuento = (index: number, pesos: number) => {
    setCarrito((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, descuentoPct: null, discount: Math.max(0, Math.min(c.unitPrice * c.quantity, pesos)) }
          : c,
      ),
    );
  };

  const cambiarPorcentaje = (index: number, pct: number) => {
    setCarrito((prev) =>
      prev.map((c, i) =>
        i === index ? conPct({ ...c, descuentoPct: pct > 0 ? Math.min(100, pct) : null }) : c,
      ),
    );
  };

  const bruto = carrito.reduce((a, c) => a + c.unitPrice * c.quantity, 0);
  const descuentos = carrito.reduce((a, c) => a + c.discount, 0);
  const total = bruto - descuentos;

  const dividido = pagos.length > 1;
  const pagosEfectivos: Pago[] = dividido ? pagos : [{ method: pagos[0].method, amount: total }];
  const sumaPagos = pagosEfectivos.reduce((a, p) => a + p.amount, 0);
  const faltante = total - sumaPagos;

  const cambiarPago = (index: number, cambio: Partial<Pago>) =>
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, ...cambio } : p)));

  const dividirPago = () =>
    setPagos((prev) => {
      if (prev.length === 1) {
        // Al dividir, la primera parte arranca con todo y la nueva en cero:
        // se baja la primera y se escribe la segunda.
        return [{ ...prev[0], amount: total }, { method: "", amount: 0 }];
      }
      return [...prev, { method: "", amount: Math.max(0, faltante) }];
    });

  const quitarPago = (index: number) =>
    setPagos((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const registrar = () => {
    setError(null);
    if (!branchId) {
      setError("Elige un local.");
      return;
    }
    if (carrito.length === 0) {
      setError("Agrega al menos un producto o servicio.");
      return;
    }
    if (cliente?.nuevo && (!clientName.trim() || clientPhone.replace(/\D/g, "").length < 10)) {
      setError("Para crear el cliente nuevo escribe su nombre y un celular de 10 dígitos.");
      return;
    }
    if (dividido) {
      if (pagosEfectivos.some((p) => !p.method)) {
        setError("Elige el medio de cada parte del pago.");
        return;
      }
      if (faltante !== 0) {
        setError(
          faltante > 0
            ? `Faltan ${formatCOP(faltante)} por asignar en los pagos.`
            : `Los pagos suman ${formatCOP(-faltante)} más que el total.`,
        );
        return;
      }
    }
    startTransition(async () => {
      const r = await crearVenta({
        branchId,
        clientName: clientName || undefined,
        clientPhone: clientPhone || undefined,
        clientDocType: clientDocType || undefined,
        clientDocument: clientDocType ? clientDocument : undefined,
        notes: notes || undefined,
        items: carrito.map((c) => ({
          kind: c.kind,
          id: c.id,
          quantity: c.quantity,
          discount: c.discount,
          staffId: c.staffId || undefined,
          // Solo los servicios llevan precio propio: los de precio variable
          // ("desde…") se cobran según el caso.
          ...(c.kind === "SERVICE" ? { precio: c.unitPrice } : {}),
        })),
        // Sin medio elegido y sin dividir = "sin especificar", como antes.
        pagos: pagosEfectivos
          .filter((p): p is { method: MetodoPago; amount: number } => Boolean(p.method))
          .map((p) => ({ method: p.method, amount: p.amount })),
        pagoDividido: dividido,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/admin/ventas/${r.id}?ok=creada`);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Lo primero: la clienta. Al elegirla se llenan sus datos. */}
      <div>
        <p className="mb-2 text-[11px] tracking-[0.12em] text-muted uppercase">Cliente</p>
        <BuscadorCliente
          elegido={cliente ? { name: clientName, phone: clientPhone, nuevo: cliente.nuevo } : null}
          onElegir={(c) => {
            setCliente({ nuevo: false });
            setClientName(c.name);
            setClientPhone(c.phone);
            if (c.document && c.documentType) {
              setClientDocType(c.documentType);
              setClientDocument(c.document);
            }
          }}
          onNuevo={(texto) => {
            setCliente({ nuevo: true });
            const esNumero = /^[\d\s+()-]+$/.test(texto);
            setClientName(esNumero ? "" : texto);
            setClientPhone(esNumero ? texto : "");
          }}
          onCambiar={() => {
            setCliente(null);
            setClientName("");
            setClientPhone("");
            setClientDocType("");
            setClientDocument("");
          }}
        />
        {cliente ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" name="clientName" required={cliente.nuevo}>
              <Input name="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </Field>
            <Field label="Celular" name="clientPhone" required={cliente.nuevo}>
              <Input
                name="clientPhone"
                inputMode="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <p className="t-small mt-2">Si no buscas a nadie, la venta queda sin cliente (consumidor final).</p>
        )}
      </div>

      {lookups.sedes.length > 1 && (
        <Field label="Local" name="branchId" required>
          <Select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
            {lookups.sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Opcional: solo si la clienta quiere dejar su documento. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Documento (opcional)" name="clientDocType">
          <Select
            name="clientDocType"
            value={clientDocType}
            onChange={(e) => setClientDocType(e.target.value)}
          >
            <option value="">Consumidor final</option>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        {clientDocType && (
          <Field label="Número de documento" name="clientDocument" required>
            <Input
              name="clientDocument"
              value={clientDocument}
              onChange={(e) => setClientDocument(e.target.value)}
            />
          </Field>
        )}
      </div>

      <div className="border-t border-stone/70 pt-5">
        <p className="mb-3 text-[11px] tracking-[0.12em] text-muted uppercase">
          Productos y servicios
        </p>

        {carrito.length > 0 && (
          <div className="mb-4 divide-y divide-stone border border-stone">
            {carrito.map((c, i) => (
              <div key={`${c.kind}-${c.id}-${i}`} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {c.quantity}× {c.name}
                  </p>
                  <p className="t-small">
                    {c.discount > 0 ? (
                      <>
                        <span className="line-through">{formatCOP(c.unitPrice * c.quantity)}</span>{" "}
                        {formatCOP(c.unitPrice * c.quantity - c.discount)}
                      </>
                    ) : (
                      formatCOP(c.unitPrice * c.quantity)
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {c.kind === "SERVICE" && (
                    <label className="flex items-center gap-1.5" title="Precio del servicio (para los de precio variable)">
                      <span className="t-small">Precio $</span>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Precio de ${c.name}`}
                        value={c.unitPrice}
                        onChange={(e) =>
                          cambiarLinea(i, { unitPrice: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                        }
                        className="w-24 rounded-lg border border-stone px-2 py-1 text-right text-sm"
                      />
                    </label>
                  )}
                  <select
                    aria-label={`Quién vendió ${c.name}`}
                    value={c.staffId}
                    onChange={(e) => cambiarLinea(i, { staffId: e.target.value })}
                    className="max-w-[12rem] border border-stone bg-white px-2 py-1 text-sm text-ink"
                  >
                    <option value="">Vendió: sin asignar</option>
                    {equipoDeLaSede.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {/* El descuento se puede dar en porcentaje ("un 20%") o en
                      pesos ("quítale veinte mil"): escribir en uno calcula el
                      otro. Lo que se guarda son los pesos. */}
                  <label className="flex items-center gap-1.5">
                    <span className="t-small">Dcto %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={
                        c.descuentoPct ??
                        (c.discount > 0
                          ? Math.round((c.discount / (c.unitPrice * c.quantity)) * 1000) / 10
                          : "")
                      }
                      onChange={(e) => cambiarPorcentaje(i, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 rounded-lg border border-stone px-2 py-1 text-right text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="t-small">$</span>
                    <input
                      type="number"
                      min={0}
                      max={c.unitPrice * c.quantity}
                      value={c.discount || ""}
                      onChange={(e) => cambiarDescuento(i, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 rounded-lg border border-stone px-2 py-1 text-right text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => quitarDelCarrito(i)}
                    className="text-xs text-clay underline underline-offset-2 hover:text-marea"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            {descuentos > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <p className="t-small">Descuentos</p>
                <p className="t-small">−{formatCOP(descuentos)}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm text-ink">Total</p>
              <p className="text-sm text-ink">{formatCOP(total)}</p>
            </div>
          </div>
        )}

        <BuscadorCatalogo
          opciones={opciones}
          equipo={equipoDeLaSede}
          conDescuento
          onAgregar={agregarAlCarrito}
        />
      </div>

      {/* Pago: uno o varios medios. Con uno solo, el valor es el total. */}
      <div className="border-t border-stone/70 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.12em] text-muted uppercase">Pago</p>
          <button
            type="button"
            onClick={dividirPago}
            className="text-xs text-marea underline underline-offset-2"
          >
            {dividido ? "+ Otro medio" : "Pagar con varios medios"}
          </button>
        </div>

        <div className="space-y-2">
          {pagos.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2">
              <select
                aria-label="Medio de pago"
                value={p.method}
                onChange={(e) => cambiarPago(i, { method: e.target.value as MetodoPago | "" })}
                className="w-full border border-stone bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">{dividido ? "Elige el medio…" : "Sin especificar"}</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {METODO_PAGO_LABEL[m]}
                  </option>
                ))}
              </select>
              {dividido ? (
                <input
                  type="number"
                  min={0}
                  aria-label="Valor"
                  value={p.amount || ""}
                  placeholder="0"
                  onChange={(e) => cambiarPago(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full border border-stone bg-white px-3 py-2 text-right text-sm text-ink"
                />
              ) : (
                <p className="px-3 text-right text-sm text-ink">{formatCOP(total)}</p>
              )}
              {dividido ? (
                <button
                  type="button"
                  onClick={() => quitarPago(i)}
                  aria-label="Quitar este medio"
                  className="px-2 text-xs text-clay hover:text-marea"
                >
                  ✕
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>

        {dividido && (
          <p className={`mt-2 text-right text-sm ${faltante === 0 ? "text-muted" : "text-terra"}`}>
            {faltante === 0
              ? "Los pagos cuadran con el total."
              : faltante > 0
                ? `Faltan ${formatCOP(faltante)}`
                : `Sobran ${formatCOP(-faltante)}`}
          </p>
        )}
      </div>

      <Field label="Nota (opcional)" name="notes">
        <Textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone/70 pt-5">
        <button
          type="button"
          onClick={registrar}
          disabled={pending}
          className="btn btn-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Registrando…" : "Registrar venta"}
        </button>
      </div>
    </div>
  );
}
