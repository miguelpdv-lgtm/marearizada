import { CardHeader, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { actualizarComisionCategoria, createServiceCategory, deleteServiceCategory } from "../actions";

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
        description="Agrupan los servicios al reservar. Cada una define el % de comisión de sus servicios y en qué agenda (Salón o Nails) aparecen."
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
                  <Th>Comisión y agenda</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#effbfb]">
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
                    <Td>
                      <form action={actualizarComisionCategoria} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <label className="flex items-center gap-1 text-sm text-ink">
                          <span className="sr-only">Comisión de {c.name} (%)</span>
                          <input
                            name="commissionPercent"
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={c.commissionPercent ?? ""}
                            placeholder="0"
                            className="admin-control w-20 px-2 py-1.5 text-sm"
                          />
                          %
                        </label>
                        <label className="sr-only" htmlFor={`agenda-${c.id}`}>Agenda de {c.name}</label>
                        <select
                          id={`agenda-${c.id}`}
                          name="agenda"
                          defaultValue={c.agenda}
                          className="admin-control w-auto px-2 py-1.5 text-sm"
                        >
                          <option value="SALON">Salón</option>
                          <option value="NAILS">Nails</option>
                        </select>
                        <button type="submit" className="btn btn-outline px-3 py-1.5 text-[10px]">
                          Guardar
                        </button>
                      </form>
                    </Td>
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
