import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { TeamForm } from "../TeamForm";
import { createTeamMember } from "../actions";

export const metadata = { title: "Nuevo integrante" };

export default async function NewTeamMemberPage() {
  const [branches, services, businessHours] = await Promise.all([
    prisma.branch.findMany({ orderBy: { order: "asc" } }),
    prisma.service.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { order: "asc" },
    }),
    prisma.businessHour.findMany(),
  ]);

  return (
    <>
      <PageHeader
        title="Nuevo integrante"
        breadcrumb={{ label: "Equipo", href: "/admin/equipo" }}
      />
      <TeamForm
        action={createTeamMember}
        branches={branches}
        services={services}
        businessHours={businessHours}
        submitLabel="Crear integrante"
      />
    </>
  );
}
