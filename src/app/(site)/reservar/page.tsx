import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/site";
import { hoyBogota } from "@/lib/agenda";
import { whatsappLink } from "@/lib/format";
import { ReservaFlow } from "./ReservaFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva tu cita",
  description:
    "Agenda tu cita en Marea Rizada: elige el servicio, la profesional, el día y la hora.",
  alternates: { canonical: "/reservar" },
};

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  const { servicio: servicioInicial } = await searchParams;
  const settings = await getSettings();
  const activa = settings.bool("phase.bookingEnabled");

  const [sede, categorias, equipo] = await Promise.all([
    prisma.branch.findFirst({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        services: { where: { active: true, bookable: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { services: { select: { serviceId: true } } },
    }),
  ]);

  const lineas = categorias
    .filter((c) => c.services.length > 0)
    .map((c) => {
      const nails = /nail|uña/i.test(`${c.slug} ${c.name}`);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        variante: nails ? ("nails" as const) : ("salon" as const),
        pidePatron: !nails,
        servicios: c.services
          .filter((s) => !s.branchId || s.branchId === sede?.id)
          .map((s) => ({
            id: s.id,
            name: s.name,
            tagline: s.tagline,
            durationMin: s.durationMin,
            price: s.price,
            hidePrice: s.hidePrice,
          })),
      };
    })
    .filter((l) => l.servicios.length > 0);

  if (!activa || !sede || lineas.length === 0) {
    const wa = whatsappLink(
      settings.get("contact.whatsapp"),
      "¡Hola Marea Rizada! Quiero agendar una cita.",
    );

    return (
      <section className="bg-canvas">
        <div className="shell py-24 text-center">
          <p className="t-eyebrow text-terra-deep">Agenda</p>
          <h1 className="t-editorial mt-4 text-ink">La reserva en línea está en pausa</h1>
          <p className="mx-auto mt-5 max-w-md text-muted">Escríbenos y te agendamos de una vez.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Escribir por WhatsApp
              </a>
            )}
            <Link href="/" className="btn btn-outline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ReservaFlow
      hoy={hoyBogota()}
      maxDias={Number(settings.get("booking.maxDaysAhead", "60")) || 60}
      servicioInicial={servicioInicial}
      sede={{
        id: sede.id,
        name: sede.name,
        address: sede.address,
        whatsapp: sede.whatsapp ?? settings.get("contact.whatsapp") ?? null,
      }}
      lineas={lineas}
      equipo={equipo
        .filter((p) => !p.branchId || p.branchId === sede.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          imageUrl: p.imageUrl,
          servicios: p.services.map((s) => s.serviceId),
        }))}
    />
  );
}
