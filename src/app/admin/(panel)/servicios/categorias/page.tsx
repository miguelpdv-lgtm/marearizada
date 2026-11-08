import { CardHeader, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { createServiceCategory, deleteServiceCategory } from "../actions";

export const metadata = { title: "Categorías de servicios" };

export default async function ServiceCategoriesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { services: true } } },
  });

  return (
    <>
      <PageHeader
        title="Categorías de servicios"
        description="Agrupan los servicios en la página pública."
        breadcrumb={{ label: "Servicios", href: "/admin/servicios" }}
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {categories.length === 0 ? (
            <p className="border border-dashed border-stone px-6 py-12 text-center text-sm font-normal text-muted">
              Todavía no hay categorías.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Categoría</Th>
                  <Th>Servicios</Th>
                  <Th>Orden</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-sand/30">
                    <Td>
                      <p className="text-sm text-ink">{c.name}</p>
                      {c.description && (
                        <p className="mt-0.5 text-xs font-normal text-muted">
                          {c.description}
                        </p>
                      )}
                    </Td>
                    <Td className="text-sm font-normal text-muted">
                      {c._count.services}
                    </Td>
                    <Td className="text-sm font-normal text-muted">{c.order}</Td>
                    <Td className="text-right">
                      <form action={deleteServiceCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <DeleteButton
                          confirmMessage={`¿Eliminar la categoría "${c.name}"? Los ${c._count.services} servicios que la usan quedarán sin categoría, pero no se borran.`}
                        />
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="lg:col-span-2">
          <CardHeader title="Nueva categoría" />
          <div className="mt-6">
            <CategoryForm action={createServiceCategory} />
          </div>
        </div>
      </div>
    </>
  );
}
