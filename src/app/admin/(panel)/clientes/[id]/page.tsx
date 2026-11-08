import { notFound } from "next/navigation";

import { EmptyState, PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { fechaBogota, horaBogota, lookupsReservaAdmin } from "@/lib/agenda";
import { formatCOP, whatsappLink } from "@/lib/format";
import { HistorialCliente, type CitaCliente } from "./HistorialCliente";
import { ComprasCliente, type Compra } from "./ComprasCliente";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cliente" };

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    select: { id: true, city: true },
  });
  const sedes = sedesPermitidas(user, todasLasSedes);
  const permitidasIds = sedes.map((s) => s.id);

  const cliente = await prisma.client.findUnique({ where: { id } });
  if (!cliente) notFound();

  const [citasRaw, ventasRaw, lookupsCompletos] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: id, branchId: { in: permitidasIds } },
      orderBy: { startsAt: "desc" },
      include: {
        service: { select: { name: true, price: true } },
        branch: { select: { city: true } },
        staff: { select: { name: true } },
        items: { orderBy: { createdAt: "asc" }, include: { staff: { select: { name: true } } } },
      },
    }),
    prisma.sale.findMany({
      where: { clientId: id, branchId: { in: permitidasIds } },
      orderBy: { createdAt: "desc" },
      include: { branch: { select: { city: true } }, items: true },
    }),
    lookupsReservaAdmin(),
  ]);

  if (citasRaw.length === 0 && ventasRaw.length === 0) notFound();

  const lookups = { ...lookupsCompletos, sedes };

  const citasCliente: CitaCliente[] = citasRaw.map((c) => ({
    id: c.id,
    code: c.code,
    branchId: c.branchId,
    serviceId: c.serviceId,
    staffId: c.staffId,
    date: fechaBogota(c.startsAt),
    clientName: c.clientName,
    clientPhone: c.clientPhone,
    clientEmail: c.clientEmail,
    notes: c.notes,
    internalNotes: c.internalNotes,
    servicio: c.service.name,
    servicePrice: c.service.price,
    paymentMethod: c.paymentMethod,
    priceOverride: c.priceOverride,
    status: c.status,
    inicioMin: aMinutos(horaBogota(c.startsAt)),
    finMin: aMinutos(horaBogota(c.endsAt)),
    firstVisit: c.firstVisit,
    curlType: c.curlType,
    ciudad: c.branch.city,
    profesional: c.staff?.name ?? null,
    endsAtIso: c.endsAt.toISOString(),
    items: c.items.map(({ staff, ...i }) => ({
      ...i,
      kind: i.kind as "SERVICE" | "PRODUCT",
      staffName: staff?.name ?? null,
    })),
    depositPaid: c.depositPaid,
  }));

  // "Compras": productos vendidos dentro de una cita y ventas de mostrador.
  const compras: Compra[] = [
    ...citasRaw.flatMap((c) =>
      c.items
        .filter((i) => i.kind === "PRODUCT")
        .map((i) => ({
          id: i.id,
          fecha: c.startsAt.toISOString(),
          fuente: "Cita" as const,
          sede: c.branch.city,
          detalle: `${i.quantity}× ${i.name}`,
          monto: i.unitPrice * i.quantity,
        })),
    ),
    ...ventasRaw.map((v) => ({
      id: v.id,
      fecha: v.createdAt.toISOString(),
      fuente: "Venta" as const,
      sede: v.branch.city,
      detalle: v.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "—",
      monto: v.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0),
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const gastoTotal = compras.reduce((a, c) => a + c.monto, 0);
  const wa = whatsappLink(cliente.phone, `Hola ${cliente.name.split(" ")[0]}!`);

  return (
    <>
      <PageHeader
        title={cliente.name}
        description={`${cliente.phone}${cliente.email ? ` · ${cliente.email}` : ""} · ${citasCliente.length} ${citasCliente.length === 1 ? "cita" : "citas"} · ${formatCOP(gastoTotal)} en compras`}
        breadcrumb={{ label: "Clientes", href: "/admin/clientes" }}
      />

      <div className="mb-8 flex flex-wrap gap-3">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-gold-500"
          >
            Escribir a WhatsApp
          </a>
        )}
        {cliente.email && (
          <a
            href={`mailto:${cliente.email}`}
            className="border border-stone px-4 py-2 text-sm text-ink transition-colors hover:border-terra"
          >
            Enviar correo
          </a>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] tracking-[0.12em] text-muted uppercase">Citas</p>
          {citasCliente.length === 0 ? (
            <EmptyState title="Sin citas" description="No tiene reservas en las sedes que puedes ver." />
          ) : (
            <HistorialCliente citas={citasCliente} lookups={lookups} />
          )}
        </div>

        <div>
          <p className="mb-3 text-[11px] tracking-[0.12em] text-muted uppercase">Compras</p>
          {compras.length === 0 ? (
            <EmptyState title="Sin compras" description="No tiene productos comprados registrados." />
          ) : (
            <ComprasCliente compras={compras} />
          )}
        </div>
      </div>
    </>
  );
}
