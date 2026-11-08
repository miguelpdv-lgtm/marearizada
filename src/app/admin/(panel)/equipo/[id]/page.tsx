import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { TeamForm } from "../TeamForm";
import { deleteTeamMember, updateTeamMember } from "../actions";

export const metadata = { title: "Editar integrante" };

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [member, branches, services, schedule, staffServices, businessHours] =
    await Promise.all([
      prisma.teamMember.findUnique({ where: { id } }),
      prisma.branch.findMany({ orderBy: { order: "asc" } }),
      prisma.service.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { order: "asc" },
      }),
      prisma.staffSchedule.findMany({ where: { staffId: id } }),
      prisma.staffService.findMany({ where: { staffId: id } }),
      prisma.businessHour.findMany(),
    ]);

  if (!member) notFound();

  const update = updateTeamMember.bind(null, member.id);

  return (
    <>
      <PageHeader
        title={member.name}
        description={member.role}
        breadcrumb={{ label: "Equipo", href: "/admin/equipo" }}
      />

      <TeamForm
        action={update}
        member={member}
        branches={branches}
        services={services}
        schedule={schedule}
        assignedServiceIds={staffServices.map((s) => s.serviceId)}
        businessHours={businessHours}
        extra={
          <form action={deleteTeamMember} className="ml-auto">
            <input type="hidden" name="id" value={member.id} />
            <DeleteButton
              confirmMessage={`¿Eliminar a ${member.name} del equipo mostrado en el sitio?`}
            />
          </form>
        }
      />
    </>
  );
}
