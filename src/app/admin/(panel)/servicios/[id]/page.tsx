import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { ServiceForm } from "../ServiceForm";
import { deleteService, updateService } from "../actions";

export const metadata = { title: "Editar servicio" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [service, categories, staff, staffService] = await Promise.all([
    prisma.service.findUnique({ where: { id } }),
    prisma.serviceCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { branch: { select: { city: true } } },
    }),
    prisma.staffService.findMany({ where: { serviceId: id } }),
  ]);

  if (!service) notFound();

  const update = updateService.bind(null, service.id);

  return (
    <>
      <PageHeader
        title={service.name}
        description={`/servicios/${service.slug}`}
        breadcrumb={{ label: "Servicios", href: "/admin/servicios" }}
      />

      <ServiceForm
        action={update}
        service={service}
        categories={categories}
        staff={staff}
        assignedStaffIds={staffService.map((s) => s.staffId)}
        extra={
          <form action={deleteService} className="ml-auto">
            <input type="hidden" name="id" value={service.id} />
            <DeleteButton
              confirmMessage={`¿Eliminar el servicio "${service.name}"? Esta acción no se puede deshacer.`}
            />
          </form>
        }
      />
    </>
  );
}
