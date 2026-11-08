import Link from "next/link";

import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { aUtc, hoyBogota, sumarDias } from "@/lib/agenda";
import { formatCOP, formatDateTime } from "@/lib/format";
import { GraficaDona } from "@/components/admin/GraficaDona";
import { desgloseVentas, tajadasDesglose } from "@/lib/desgloseVentas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas" };

type VentaFila = {
  id: string;
  fecha: Date;
  branch: string;
  cliente: string;
  detalle: string;
  items: number;
  /** Precio de lista de todo lo vendido. */
  valor: number;
  /** Lo que se rebajó, en pesos. */
  descuento: number;
  /** Lo que de verdad pagó la clienta: valor − descuento. */
  pagado: number;
  responsable: string;
  tipo: string;
  origen: string;
  href?: string;
};

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; fecha?: string }>;
}) {
  const sp = await searchParams;
  const hoy = hoyBogota();
  const fecha = sp.fecha === "todo"
    ? null
    : sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha)
      ? sp.fecha
      : hoy;

  const user = await requireUser();
  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });
  const permitidas = sedesPermitidas(user, todasLasSedes);
  const sedeId = sedeEfectiva(permitidas, sp.sede);
  const branchIds = sedeId ? [sedeId] : permitidas.map((s) => s.id);
  const rango = fecha
    ? { gte: aUtc(fecha, "00:00"), lt: aUtc(sumarDias(fecha, 1), "00:00") }
    : undefined;

  const [ventas, servicios] = await Promise.all([
    prisma.sale.findMany({
      where: { branchId: { in: branchIds }, ...(rango ? { createdAt: rango } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { city: true } },
        soldBy: { select: { name: true } },
        staff: { select: { name: true } },
        items: { select: { name: true, unitPrice: true, quantity: true, discount: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        branchId: { in: branchIds },
        status: "ATENDIDA",
        // Las citas cerradas con "Finalizar cita" ya están como venta (con
        // su factura); acá solo quedan las atendidas antes de ese botón.
        sale: null,
        ...(rango ? { startsAt: rango } : {}),
      },
      orderBy: { startsAt: "desc" },
      include: {
        branch: { select: { city: true } },
        service: { select: { name: true, price: true } },
        staff: { select: { name: true } },
        items: { select: { name: true, unitPrice: true, quantity: true } },
      },
    }),
  ]);

  const filas: VentaFila[] = [
    ...ventas.map((venta) => ({
      id: `venta-${venta.id}`,
      fecha: venta.createdAt,
      branch: venta.branch.city,
      cliente: venta.clientName ?? "Sin registrar",
      detalle: venta.items.map((item) => `${item.quantity}× ${item.name}`).join(", ") || "Sin ítems",
      items: venta.items.reduce((total, item) => total + item.quantity, 0),
      ...montos(
        venta.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
        venta.items.reduce((total, item) => total + item.discount, 0),
      ),
      responsable: venta.staff?.name ?? venta.soldBy?.name ?? "—",
      tipo: venta.appointmentId ? "Cita" : "Venta",
      origen: venta.appointmentId ? "Agenda" : "Mostrador",
      href: `/admin/ventas/${venta.id}`,
    })),
    ...servicios.map((servicio) => ({
      id: `servicio-${servicio.id}`,
      fecha: servicio.startsAt,
      branch: servicio.branch.city,
      cliente: servicio.clientName,
      detalle: [
        servicio.service.name,
        ...servicio.items.map((item) => `${item.quantity}× ${item.name}`),
      ].join(", "),
      items: 1 + servicio.items.reduce((total, item) => total + item.quantity, 0),
      // Un precio ajustado a la baja en la cita es un descuento sobre el
      // precio del servicio; uno ajustado al alza no lo es.
      ...montos(
        servicio.service.price +
          servicio.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
        Math.max(0, servicio.service.price - (servicio.priceOverride ?? servicio.service.price)),
        (servicio.priceOverride ?? servicio.service.price) +
          servicio.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      ),
      responsable: servicio.staff?.name ?? "Sin asignar",
      tipo: "Servicio",
      origen: "Agenda (sin cerrar)",
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  // Las donas usan el mismo cálculo que Reportes.
  const donas = tajadasDesglose(
    await desgloseVentas({
      branchIds,
      desde: rango?.gte,
      hasta: rango?.lt,
    }),
  );

  const totalValor = filas.reduce((sum, fila) => sum + fila.valor, 0);
  const totalDescuento = filas.reduce((sum, fila) => sum + fila.descuento, 0);
  const totalPagado = filas.reduce((sum, fila) => sum + fila.pagado, 0);
  const totalServicios = filas.filter((fila) => fila.tipo === "Servicio").length;
  const nuevaVentaHref = `/admin/ventas/nuevo${sedeId ? `?sede=${encodeURIComponent(sedeId)}` : ""}`;

  const enlace = (extra: { sede?: string; fecha?: string }) => {
    const params = new URLSearchParams();
    const sede = extra.sede === undefined ? sedeId : extra.sede;
    const filtroFecha = extra.fecha === undefined ? (fecha ?? "todo") : extra.fecha;
    if (sede) params.set("sede", sede);
    if (filtroFecha !== hoy) params.set("fecha", filtroFecha);
    const query = params.toString();
    return `/admin/ventas${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Ventas y servicios atendidos en un solo lugar."
        action={{ label: "Nueva venta", href: nuevaVentaHref }}
      />

      <div className="admin-card mb-8 flex flex-wrap items-end gap-4 bg-paper p-5 sm:p-6">
        <div>
          <p className="admin-kicker mb-2">Período</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={enlace({ fecha: hoy })}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                fecha === hoy ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
              }`}
            >
              Hoy
            </Link>
            <Link
              href={enlace({ fecha: "todo" })}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                fecha === null ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
              }`}
            >
              Todo el histórico
            </Link>
          </div>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2">
          {sedeId && <input type="hidden" name="sede" value={sedeId} />}
          <label className="admin-kicker flex flex-col gap-2">
            Elegir fecha
            <input
              type="date"
              name="fecha"
              defaultValue={fecha ?? ""}
              className="admin-control min-w-44 px-3 py-2 text-sm font-normal normal-case tracking-normal"
            />
          </label>
          <button type="submit" className="btn btn-outline rounded-lg px-4 py-2 text-[11px]">
            Aplicar
          </button>
        </form>

        <div className="ml-auto grid grid-cols-2 gap-5 border-l border-ink/10 pl-5 sm:grid-cols-5">
          <Summary label="Registros" value={filas.length.toLocaleString("es-CO")} />
          <Summary label="Servicios" value={totalServicios.toLocaleString("es-CO")} />
          <Summary label="Valor de lista" value={formatCOP(totalValor)} />
          <Summary label="Descuentos" value={totalDescuento > 0 ? `−${formatCOP(totalDescuento)}` : formatCOP(0)} />
          <Summary label="Ingresos (pagado)" value={formatCOP(totalPagado)} />
        </div>
      </div>

      {filas.length > 0 && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <GraficaDona titulo="Servicios vs. productos" tajadas={donas.tipo} />
          <GraficaDona titulo="Medios de pago" tajadas={donas.metodo} />
        </div>
      )}

      {filas.length === 0 ? (
        <EmptyState
          title={fecha ? "No hay movimientos en este día" : "Todavía no hay movimientos"}
          description={fecha ? "Prueba con “Todo el histórico” para consultar ventas y servicios anteriores." : undefined}
          action={fecha ? { label: "Ver todo el histórico", href: enlace({ fecha: "todo" }) } : { label: "Nueva venta", href: nuevaVentaHref }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Tipo</Th>
              <Th>Cliente</Th>
              <Th>Detalle</Th>
              <Th className="hidden sm:table-cell">Local</Th>
              <Th className="hidden md:table-cell">Valor</Th>
              <Th className="hidden md:table-cell">Descuento</Th>
              <Th>Pagado</Th>
              <Th className="hidden sm:table-cell">Origen</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="transition-colors hover:bg-sand/30">
                <Td className="whitespace-nowrap text-sm text-ink">{formatDateTime(fila.fecha)}</Td>
                <Td><span className="font-medium text-ink">{fila.tipo}</span></Td>
                <Td className="max-w-44 text-sm text-muted">{fila.cliente}</Td>
                <Td className="max-w-64 text-sm text-muted">{fila.detalle}</Td>
                <Td className="hidden text-sm text-muted sm:table-cell">{fila.branch}</Td>
                <Td className="hidden whitespace-nowrap text-sm text-muted md:table-cell">{formatCOP(fila.valor)}</Td>
                <Td className="hidden whitespace-nowrap text-sm md:table-cell">
                  {fila.descuento > 0 ? (
                    <span className="text-terra">
                      −{formatCOP(fila.descuento)}{" "}
                      <span className="text-xs text-muted">({Math.round((fila.descuento / fila.valor) * 100)}%)</span>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-sm font-semibold text-ink">
                  {formatCOP(fila.pagado)}
                  {fila.descuento > 0 && (
                    <span className="block text-xs font-normal text-terra md:hidden">
                      con −{formatCOP(fila.descuento)}
                    </span>
                  )}
                </Td>
                <Td className="hidden sm:table-cell"><span className="rounded-full border border-stone bg-sand/50 px-2.5 py-1 text-[10px] tracking-[0.08em] text-muted uppercase">{fila.origen}</span></Td>
                <Td className="text-right">
                  {fila.href ? (
                    <Link href={fila.href} className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-terra">Ver</Link>
                  ) : (
                    <span className="text-[10px] tracking-[0.14em] text-clay uppercase">Importada</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

/** Valor de lista, descuento y lo pagado de una fila. */
function montos(valor: number, descuento: number, pagado = valor - descuento) {
  return { valor, descuento, pagado };
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="display text-xl text-ink sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] tracking-[0.1em] text-muted uppercase">{label}</p>
    </div>
  );
}
