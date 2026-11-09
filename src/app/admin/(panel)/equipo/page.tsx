import Link from "next/link";

import {
  ActiveBadge,
  DemoNotice,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Thumb,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";

export const metadata = { title: "Equipo" };

export default async function TeamAdminPage() {
  const team = await prisma.teamMember.findMany({
    orderBy: { order: "asc" },
    include: { branch: { select: { city: true } } },
  });

  const anyPhoto = team.some((m) => m.imageUrl);

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Las personas que aparecen en la sección “Conoce al equipo”."
        action={{ label: "Nuevo integrante", href: "/admin/equipo/nuevo" }}
      />

      {!anyPhoto && team.length > 0 && (
        <DemoNotice>
          Los integrantes cargados son <strong>contenido de ejemplo</strong> del
          seed inicial. Reemplaza los nombres, cargos y fotografías por los del
          equipo real antes de publicar el sitio.
        </DemoNotice>
      )}

      {team.length === 0 ? (
        <EmptyState
          title="Todavía no hay integrantes"
          action={{ label: "Nuevo integrante", href: "/admin/equipo/nuevo" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Integrante</Th>
              <Th>Especialidad</Th>
              <Th>Local</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id} className="transition-colors hover:bg-[#effbfb]">
                <Td>
                  <div className="flex items-center gap-3">
                    <Thumb src={member.imageUrl} alt={member.name} fallback="👤" />
                    <div className="min-w-0 max-w-sm">
                      <p className="truncate text-sm text-ink">{member.name}</p>
                      <p className="truncate text-xs font-normal text-muted">
                        {member.role}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="text-sm font-normal text-muted">
                  {member.specialty}
                </Td>
                <Td className="text-sm font-normal text-muted">
                  {member.branch?.city ?? "—"}
                </Td>
                <Td>
                  <ActiveBadge active={member.active} />
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/equipo/${member.id}`}
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
