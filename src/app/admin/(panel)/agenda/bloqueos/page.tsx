import { CardHeader, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { aUtc, fechaBogota, horaBogota, hoyBogota } from "@/lib/agenda";
import { BloqueoForm } from "./BloqueoForm";
import Link from "next/link";

import { borrarBloqueo, borrarHabilitacion } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bloqueo de horas" };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fechaLarga(f: string) {
  const [, m, d] = f.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** "todo el día" cuando cubre de 00:00 a 23:59. */
function esDiaCompleto(inicio: Date, fin: Date) {
  return horaBogota(inicio) === "00:00" && horaBogota(fin) === "23:59";
}

export default async function BloqueosPage() {
  const hoy = hoyBogota();

  const [sedes, bloqueos, equipo, habilitadas] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.timeOff.findMany({
      where: { endsAt: { gte: aUtc(hoy, "00:00") } },
      orderBy: { startsAt: "asc" },
      include: { branch: { select: { city: true } }, staff: { select: { name: true } } },
    }),
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.staffExtraHours.findMany({
      where: { endsAt: { gte: aUtc(hoy, "00:00") } },
      orderBy: { startsAt: "asc" },
      include: { branch: { select: { city: true } }, staff: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Bloqueo de horas"
        description="Festivos, capacitaciones o cierres puntuales. Las horas bloqueadas dejan de ofrecerse en el sitio de inmediato."
        breadcrumb={{ label: "Agenda", href: "/admin/agenda" }}
      />

      <div className="mb-6 rounded-xl border border-stone bg-cream px-5 py-4 text-sm text-ink">
        <strong>¿Desbloquear solo unas horas o solo a una profesional?</strong> Hazlo en la{" "}
        <Link href="/admin/agenda?vista=profesionales" className="text-terra underline underline-offset-2">
          agenda por profesionales
        </Link>
        : toca el bloqueo 🔒 y elige &ldquo;Solo unas horas&rdquo; o &ldquo;Solo para…&rdquo;. Para abrirle
        horas a una profesional fuera de su horario (o quitarle un bloqueo de un rango), arrastra sobre su
        columna y elige <strong>✓ Habilitar</strong>.
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          {bloqueos.length === 0 ? (
            <EmptyState
              title="No hay horas bloqueadas"
              description="La agenda se ofrece completa según el horario de cada local."
            />
          ) : (
            <div className="divide-y divide-stone rounded-xl border border-stone bg-white">
              {bloqueos.map((b) => {
                const desde = fechaBogota(b.startsAt);
                const hasta = fechaBogota(b.endsAt);
                const completo = esDiaCompleto(b.startsAt, b.endsAt);

                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        {desde === hasta
                          ? fechaLarga(desde)
                          : `${fechaLarga(desde)} → ${fechaLarga(hasta)}`}
                        <span className="ml-2 text-xs text-muted">
                          {completo
                            ? "todo el día"
                            : `${horaBogota(b.startsAt)} – ${horaBogota(b.endsAt)}`}
                        </span>
                      </p>
                      <p className="t-small mt-0.5">
                        {b.branch.city}
                        {b.staff ? ` · ${b.staff.name}` : " · todo el local"}
                        {b.reason && ` · ${b.reason}`}
                      </p>
                    </div>

                    <form action={borrarBloqueo} className="shrink-0">
                      <input type="hidden" name="id" value={b.id} />
                      <DeleteButton
                        label="Quitar"
                        confirmMessage="¿Quitar este bloqueo? Esas horas volverán a ofrecerse."
                      />
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          {habilitadas.length > 0 && (
            <div>
              <CardHeader
                title="Horas habilitadas"
                description="Horas abiertas a una profesional fuera de su horario semanal, solo ese día."
              />
              <div className="mt-4 divide-y divide-stone rounded-xl border border-emerald-600/30 bg-white">
                {habilitadas.map((h) => (
                  <div key={h.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        ✓ {fechaLarga(fechaBogota(h.startsAt))}
                        <span className="ml-2 text-xs text-muted">
                          {horaBogota(h.startsAt)} – {horaBogota(h.endsAt)}
                        </span>
                      </p>
                      <p className="t-small mt-0.5">
                        {h.branch.city} · {h.staff.name}
                        {h.reason && ` · ${h.reason}`}
                      </p>
                    </div>
                    <form action={borrarHabilitacion} className="shrink-0">
                      <input type="hidden" name="id" value={h.id} />
                      <DeleteButton
                        label="Quitar"
                        confirmMessage="¿Quitar estas horas habilitadas? Vuelve a regir su horario."
                      />
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <CardHeader
            title="Nuevo bloqueo de horas"
            description="Se aplica al instante sobre la disponibilidad del sitio."
          />
          <div className="mt-6">
            <BloqueoForm sedes={sedes} equipo={equipo} hoy={hoy} />
          </div>
        </div>
      </div>
    </>
  );
}
