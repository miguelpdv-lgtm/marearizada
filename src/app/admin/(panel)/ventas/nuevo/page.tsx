import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { lookupsReservaAdmin } from "@/lib/agenda";
import { VentaForm } from "../VentaForm";

export const metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const lookupsCompletos = await lookupsReservaAdmin();
  const sedes = sedesPermitidas(user, lookupsCompletos.sedes);
  const sedeId = sedeEfectiva(sedes, sp.sede);
  const lookups = {
    ...lookupsCompletos,
    sedes: sedeId ? [...sedes.filter((s) => s.id === sedeId), ...sedes.filter((s) => s.id !== sedeId)] : sedes,
  };

  const equipoCompleto = await prisma.teamMember.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, branchId: true },
  });
  const sedeIds = new Set(sedes.map((s) => s.id));
  const equipo = equipoCompleto.filter((p) => !p.branchId || sedeIds.has(p.branchId));

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Venta de mostrador — sin cita de por medio."
        breadcrumb={{ label: "Ventas", href: "/admin/ventas" }}
      />

      {sedes.length === 0 ? (
        <p className="t-small">
          No tienes ninguna sede asignada — pídele a un administrador que te asigne una en Usuarios.
        </p>
      ) : (
        <VentaForm lookups={lookups} equipo={equipo} />
      )}
    </>
  );
}
