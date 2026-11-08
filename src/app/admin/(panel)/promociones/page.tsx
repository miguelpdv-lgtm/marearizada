import Link from "next/link";
import type { Promotion } from "@prisma/client";

import {
  Badge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { ALCANCES, CANALES, etiquetaPromocion } from "@/lib/promociones";

import { alternarPromocion } from "./actions";

export const metadata = { title: "Promociones" };
export const dynamic = "force-dynamic";

/**
 * Cómo está una promoción hoy, más allá de su interruptor.
 *
 * Se distingue "apagada" de "programada" y de "vencida" porque las tres se ven
 * igual de inertes en el sitio y se arreglan de forma distinta: una se
 * enciende, otra hay que esperarla y la tercera hay que extenderla.
 */
function estado(p: Promotion, ahora: Date) {
  if (!p.active) return { texto: "Apagada", tono: "neutral" as const };
  if (p.startsAt && ahora < p.startsAt)
    return { texto: "Programada", tono: "gold" as const };
  if (p.endsAt && ahora > p.endsAt)
    return { texto: "Vencida", tono: "warning" as const };
  return { texto: "Aplicándose", tono: "success" as const };
}

function rango(p: Promotion) {
  const f = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("es-CO", {
          day: "numeric",
          month: "short",
          timeZone: "America/Bogota",
        }).format(d)
      : null;

  const desde = f(p.startsAt);
  const hasta = f(p.endsAt);
  if (!desde && !hasta) return "Sin fechas";
  if (desde && hasta) return `${desde} – ${hasta}`;
  return desde ? `Desde ${desde}` : `Hasta ${hasta}`;
}

export default async function PromocionesPage() {
  const promociones = await prisma.promotion.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      product: { select: { name: true } },
      service: { select: { name: true } },
      productCategory: { select: { name: true } },
      serviceCategory: { select: { name: true } },
    },
  });
  // Citas activas que usaron cada promoción (para "3 de 20 usos").
  const conteo = await prisma.appointment.groupBy({
    by: ["promotionId"],
    where: { promotionId: { not: null }, status: { not: "CANCELADA" } },
    _count: true,
  });
  const usos: Record<string, number> = Object.fromEntries(
    conteo.map((c) => [c.promotionId as string, c._count]),
  );


  const ahora = new Date();

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Descuentos para las reservas en línea y la caja. Sin código se aplican solos; con código son cupones. Gana siempre el que más rebaja: nunca se acumulan."
        action={{ label: "Nueva promoción", href: "/admin/promociones/nueva" }}
      />

      {promociones.length === 0 ? (
        <EmptyState
          title="Todavía no hay promociones"
          description="Mientras no haya ninguna, todo se vende al precio de lista."
          action={{ label: "Nueva promoción", href: "/admin/promociones/nueva" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Promoción</Th>
              <Th>Aplica a</Th>
              <Th>Vigencia</Th>
              <Th>Dónde</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {promociones.map((p) => {
              const e = estado(p, ahora);
              const objetivo =
                p.product?.name ??
                p.service?.name ??
                p.productCategory?.name ??
                p.serviceCategory?.name ??
                null;

              return (
                <tr key={p.id} className="transition-colors hover:bg-sand/30">
                  <Td>
                    <p className="text-sm text-ink">{p.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-terra">
                      {etiquetaPromocion(p)}
                      {p.code && (
                        <span className="ml-2 border border-dashed border-ink/40 px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-ink">
                          {p.code}
                        </span>
                      )}
                    </p>
                    {p.maxUses != null && (
                      <p className="mt-0.5 text-xs text-clay">
                        {usos[p.id] ?? 0} de {p.maxUses} usos
                      </p>
                    )}
                  </Td>

                  <Td>
                    <p className="text-sm font-normal text-muted">
                      {ALCANCES[p.scope as keyof typeof ALCANCES] ?? p.scope}
                    </p>
                    {objetivo && (
                      <p className="mt-0.5 text-xs font-normal text-clay">{objetivo}</p>
                    )}
                  </Td>

                  <Td className="text-sm font-normal text-muted">{rango(p)}</Td>

                  <Td className="text-sm font-normal text-muted">
                    {CANALES[p.channel as keyof typeof CANALES] ?? p.channel}
                  </Td>

                  <Td>
                    <Badge tone={e.tono}>{e.texto}</Badge>
                  </Td>

                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-4">
                      <form action={alternarPromocion}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-[10px] tracking-[0.18em] text-muted uppercase transition-colors hover:text-terra"
                        >
                          {p.active ? "Apagar" : "Encender"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/promociones/${p.id}`}
                        className="text-[10px] tracking-[0.18em] text-ink uppercase transition-colors hover:text-terra"
                      >
                        Editar
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
