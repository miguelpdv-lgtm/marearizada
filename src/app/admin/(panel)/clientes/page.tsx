import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { ESTADOS_ACTIVOS } from "@/lib/agenda";
import { ClientesTable, type ClienteFila } from "./ClientesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

/**
 * `Client` es el directorio real (importado del histórico de AgendaPro y
 * alimentado hacia adelante por `vincularCliente()` cada vez que se guarda
 * una cita o una venta — ver src/lib/clients.ts). Un cliente aparece acá si
 * tiene al menos una cita, venta o venta histórica en una sede permitida.
 */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });
  const sedes = sedesPermitidas(user, todasLasSedes);
  const sedeId = sedeEfectiva(sedes, sp.sede);
  // Sin una sede elegida, se mira cualquiera de las permitidas.
  const branchIds = sedeId ? [sedeId] : sedes.map((s) => s.id);

  const clientes = await prisma.client.findMany({
    where: {
      OR: [
        { appointments: { some: { branchId: { in: branchIds } } } },
        { sales: { some: { branchId: { in: branchIds } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      appointments: {
        where: { branchId: { in: branchIds } },
        select: { startsAt: true, status: true, priceOverride: true, service: { select: { price: true } } },
      },
      sales: {
        where: { branchId: { in: branchIds } },
        select: { createdAt: true, items: { select: { unitPrice: true, quantity: true } } },
      },
    },
  });

  const filas: ClienteFila[] = clientes.map((c) => {
    const fechas = [
      ...c.appointments.map((a) => a.startsAt),
      ...c.sales.map((s) => s.createdAt),
    ];
    const gastoCitas = c.appointments
      .filter((a) => a.status === "ATENDIDA")
      .reduce((acc, a) => acc + (a.priceOverride ?? a.service.price), 0);
    const gastoVentas = c.sales.reduce(
      (acc, s) => acc + s.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0),
      0,
    );

    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      email: c.email,
      // Cuenta toda interacción real: citas agendadas + ventas de mostrador.
      totalVisitas: c.appointments.length + c.sales.length,
      visitasActivas: c.appointments.filter((a) => ESTADOS_ACTIVOS.includes(a.status)).length,
      gastoTotal: gastoCitas + gastoVentas,
      ultimaVisita:
        fechas.length > 0 ? new Date(Math.max(...fechas.map((f) => f.getTime()))).toISOString() : null,
      primeraVisita:
        fechas.length > 0 ? new Date(Math.min(...fechas.map((f) => f.getTime()))).toISOString() : null,
    };
  });

  const enlace = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { sede: sedeId, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/admin/clientes?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="El directorio real — cada quien aparece con sus citas, ventas y compras del histórico."
      />

      {sedes.length > 1 && (
        <div className="mb-6 flex">
          <Link
            href={enlace({ sede: undefined })}
            className={`border px-4 py-2 text-sm transition-colors ${
              !sedeId ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]" : "border-[1.5px] border-[#d3e3e1] bg-white text-[#3d4643] hover:border-[#1c6f75]"
            }`}
          >
            Ambas
          </Link>
          {sedes.map((s) => (
            <Link
              key={s.id}
              href={enlace({ sede: s.id })}
              className={`border border-l-0 px-4 py-2 text-sm transition-colors ${
                sedeId === s.id ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]" : "border-[1.5px] border-[#d3e3e1] bg-white text-[#3d4643] hover:border-[#1c6f75]"
              }`}
            >
              {s.city}
            </Link>
          ))}
        </div>
      )}

      {filas.length === 0 ? (
        <EmptyState
          title="Todavía no hay clientes"
          description="Aparecen acá apenas se registre la primera reserva o venta."
        />
      ) : (
        <ClientesTable clientes={filas} />
      )}
    </>
  );
}
