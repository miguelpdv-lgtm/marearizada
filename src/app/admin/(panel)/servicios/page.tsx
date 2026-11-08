import Link from "next/link";

import {
  ActiveBadge,
  Badge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Thumb,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { formatCOP, formatDuration } from "@/lib/format";

export const metadata = { title: "Servicios" };

export default async function ServicesAdminPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { category: true },
  });

  return (
    <>
      <PageHeader
        title="Servicios"
        description="El catálogo que se muestra en la portada y en la página de servicios."
        action={{ label: "Nuevo servicio", href: "/admin/servicios/nuevo" }}
      />

      <div className="mb-6">
        <Link
          href="/admin/servicios/categorias"
          className="text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:text-terra"
        >
          Gestionar categorías →
        </Link>
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="Todavía no hay servicios"
          description="Crea el primero para que aparezca en el sitio."
          action={{ label: "Nuevo servicio", href: "/admin/servicios/nuevo" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Servicio</Th>
              <Th>Categoría</Th>
              <Th>Duración</Th>
              <Th>Precio</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="transition-colors hover:bg-sand/30">
                <Td>
                  <div className="flex items-center gap-3">
                    <Thumb src={service.imageUrl} alt={service.name} />
                    <div className="min-w-0 max-w-sm">
                      <p className="truncate text-sm text-ink">{service.name}</p>
                      <p className="truncate text-xs font-normal text-muted">
                        /servicios/{service.slug}
                      </p>
                    </div>
                  </div>
                </Td>

                <Td className="text-sm font-normal text-muted">
                  {service.category?.name ?? "—"}
                </Td>

                <Td className="text-sm font-normal text-muted">
                  {formatDuration(service.durationMin)}
                </Td>

                <Td className="text-sm text-ink">
                  {service.priceFrom && (
                    <span className="mr-1 text-[10px] text-muted uppercase">
                      desde
                    </span>
                  )}
                  {formatCOP(service.price)}
                </Td>

                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <ActiveBadge active={service.active} />
                    {service.featured && <Badge tone="gold">Destacado</Badge>}
                  </div>
                </Td>

                <Td className="text-right">
                  <div className="flex justify-end gap-4">
                    <Link
                      href={`/servicios/${service.slug}`}
                      target="_blank"
                      className="text-[10px] tracking-[0.14em] text-muted uppercase transition-colors hover:text-terra"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/admin/servicios/${service.id}`}
                      className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-terra"
                    >
                      Editar
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
