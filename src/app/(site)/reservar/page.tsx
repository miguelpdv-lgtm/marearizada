import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/site";
import { hoyBogota } from "@/lib/agenda";
import { whatsappLink } from "@/lib/format";
import { ReservaFlow } from "./ReservaFlow";
import { ManchasSeccion } from "@/components/brand/Manchas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva tu cita",
  description:
    "Agenda tu cita en Amicrespa, salón especializado en cabello rizado en Barranquilla y Cali. Las asesorías son gratis.",
  alternates: { canonical: "/reservar" },
};

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; servicio?: string }>;
}) {
  const { sede: sedeInicial, servicio: servicioInicial } = await searchParams;
  const settings = await getSettings();
  const activa = settings.bool("phase.bookingEnabled");

  const [sedes, servicios, categorias] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { businessHours: { orderBy: { weekday: "asc" } } },
    }),
    prisma.service.findMany({
      where: { active: true, bookable: true },
      orderBy: [{ order: "asc" }],
    }),
    prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!activa) {
    const wa = whatsappLink(
      settings.get("contact.whatsapp"),
      "¡Hola Amicrespa! Quiero agendar una cita.",
    );
    const externo = settings.get("phase.bookingUrl");

    return (
      <section className="con-manchas bg-cream">
        <ManchasSeccion sobre="claro" variante={2} semilla={22} />

        <div className="shell py-24 text-center">
          <p className="t-eyebrow text-terra-deep">Agenda</p>
          <h1 className="t-editorial mt-4 text-ink">
            La reserva en línea está en pausa
          </h1>
          <p className="mx-auto mt-5 max-w-md text-muted">
            Escríbenos y te agendamos de una vez.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Escribir por WhatsApp
              </a>
            )}
            {externo && (
              <a href={externo} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                Agenda anterior
              </a>
            )}
            <Link href="/servicios" className="btn btn-outline">
              Ver servicios
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
      sedeInicial={sedeInicial}
      servicioInicial={servicioInicial}
      sedes={sedes.map((s) => ({
        id: s.id,
        city: s.city,
        name: s.name,
        address: s.address,
        imageUrl: s.imageUrl,
        hours: s.hours,
        whatsapp: s.whatsapp,
        cerrados: s.businessHours.filter((h) => h.closed).map((h) => h.weekday),
        ultimaCita: Object.fromEntries(
          s.businessHours.filter((h) => !h.closed).map((h) => [h.weekday, h.closesAt]),
        ),
        cierre: s.closedNotice,
      }))}
      servicios={servicios.map((s) => ({
        id: s.id,
        branchId: s.branchId,
        categoryId: s.categoryId,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        price: s.price,
        hidePrice: s.hidePrice,
        durationMin: s.durationMin,
        imageUrl: s.imageUrl,
        featured: s.featured,
      }))}
      categorias={categorias.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
      }))}
    />
  );
}
