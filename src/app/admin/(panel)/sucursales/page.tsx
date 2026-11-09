import Link from "next/link";

import {
  ActiveBadge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Thumb,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";

export const metadata = { title: "Locales" };

export default async function BranchesAdminPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { team: true } } },
  });

  return (
    <>
      <PageHeader
        title="Locales"
        description="Direcciones, horarios y fotografías de cada local."
        action={{ label: "Nuevo local", href: "/admin/sucursales/nueva" }}
      />

      {branches.length === 0 ? (
        <EmptyState
          title="Todavía no hay locales"
          action={{ label: "Nuevo local", href: "/admin/sucursales/nueva" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Local</Th>
              <Th>Dirección</Th>
              <Th>WhatsApp</Th>
              <Th>Equipo</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id} className="transition-colors hover:bg-[#effbfb]">
                <Td>
                  <div className="flex items-center gap-3">
                    <Thumb src={branch.imageUrl} alt={branch.name} />
                    <div className="min-w-0 max-w-sm">
                      <p className="truncate text-sm text-ink">{branch.city}</p>
                      <p className="truncate text-xs font-normal text-muted">
                        {branch.name}
                      </p>
                    </div>
                  </div>
                </Td>

                <Td className="max-w-xs text-sm font-normal text-muted">
                  {branch.address}
                  {branch.neighborhood && ` · ${branch.neighborhood}`}
                </Td>

                <Td className="text-sm font-normal text-muted">
                  {branch.whatsapp ?? "—"}
                </Td>

                <Td className="text-sm font-normal text-muted">
                  {branch._count.team}
                </Td>

                <Td>
                  <ActiveBadge active={branch.active} />
                </Td>

                <Td className="text-right">
                  <Link
                    href={`/admin/sucursales/${branch.id}`}
                    className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-marea"
                  >
                    Editar
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
