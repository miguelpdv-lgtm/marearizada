import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export const metadata = { title: "Nuevo servicio" };

export default async function NewServicePage() {
  const [categories, staff] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { branch: { select: { city: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Nuevo servicio"
        breadcrumb={{ label: "Servicios", href: "/admin/servicios" }}
      />
      <ServiceForm
        action={createService}
        categories={categories}
        staff={staff}
        submitLabel="Crear servicio"
      />
    </>
  );
}
