import Link from "next/link";

import {
  ActiveBadge,
  Badge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";

export const metadata = { title: "Historias reales" };

export default async function TestimonialsAdminPage() {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Historias reales"
        description="Los testimonios que se muestran en la sección “Historias reales”."
        action={{ label: "Nueva historia", href: "/admin/historias/nueva" }}
      />


      {testimonials.length === 0 ? (
        <EmptyState
          title="Todavía no hay historias"
          action={{ label: "Nueva historia", href: "/admin/historias/nueva" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Clienta</Th>
              <Th>Cita</Th>
              <Th>Material</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-sand/30">
                <Td>
                  <p className="text-sm text-ink">{t.clientName}</p>
                  <p className="text-xs font-normal text-muted">
                    {[t.city, t.serviceName].filter(Boolean).join(" · ") || "—"}
                  </p>
                </Td>

                <Td className="max-w-sm">
                  <p className="line-clamp-2 text-sm font-normal text-muted">
                    “{t.quote}”
                  </p>
                </Td>

                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {t.videoUrl && <Badge tone="gold">Video</Badge>}
                    {t.beforeImageUrl && t.afterImageUrl && (
                      <Badge tone="gold">Antes/después</Badge>
                    )}
                    {!t.videoUrl && !t.beforeImageUrl && (
                      <span className="text-xs text-clay">Solo texto</span>
                    )}
                  </div>
                </Td>

                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <ActiveBadge active={t.active} />
                    {t.featured && <Badge tone="gold">Destacada</Badge>}
                  </div>
                </Td>

                <Td className="text-right">
                  <Link
                    href={`/admin/historias/${t.id}`}
                    className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-terra"
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
