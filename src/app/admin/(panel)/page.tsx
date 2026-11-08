import Link from "next/link";

import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { ESTADOS_ACTIVOS, aUtc, horaBogota, hoyBogota, sumarDias } from "@/lib/agenda";
import { PHASE_FLAGS } from "@/lib/constants";
import { formatCOP } from "@/lib/format";
import { ETIQUETA, TONO } from "./agenda/estado";
import { Badge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoy" };

/**
 * La pantalla de inicio del panel.
 *
 * Antes mostraba cuántos servicios y artículos había cargados. Eso responde
 * una pregunta que casi nadie se hace al entrar: quien abre el panel a las
 * nueve de la mañana quiere saber qué hay hoy y qué está esperando a alguien.
 *
 * Por eso abre con lo que no puede esperar —las citas por confirmar— y sigue
 * con la agenda del día. Los conteos de catálogo pasaron
 * al final, que es la importancia que tienen.
 */
export default async function InicioPage() {
  const user = await requireUser();
  const hoy = hoyBogota();

  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });
  const permitidas = sedesPermitidas(user, todasLasSedes);
  const sedeId = sedeEfectiva(permitidas, undefined);
  const branchIds = sedeId ? [sedeId] : permitidas.map((s) => s.id);

  const desde = aUtc(hoy, "00:00");
  const hasta = aUtc(sumarDias(hoy, 1), "00:00");

  const [
    citasHoy,
    porConfirmar,
    ventasHoy,
    servicios,
    productos,
    espacios,
    espaciosLlenos,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { branchId: { in: branchIds }, startsAt: { gte: desde, lt: hasta } },
      orderBy: { startsAt: "asc" },
      include: {
        service: { select: { name: true, price: true } },
        staff: { select: { name: true } },
        branch: { select: { city: true } },
        items: { select: { unitPrice: true, quantity: true } },
      },
    }),
    prisma.appointment.count({
      where: {
        branchId: { in: branchIds },
        status: "PENDIENTE",
        startsAt: { gte: desde },
      },
    }),
    prisma.sale.findMany({
      where: { branchId: { in: branchIds }, createdAt: { gte: desde, lt: hasta } },
      select: { items: { select: { unitPrice: true, quantity: true, discount: true } } },
    }),
    prisma.service.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.mediaSlot.count(),
    prisma.mediaSlot.count({ where: { NOT: { url: null } } }),
  ]);

  const activas = citasHoy.filter((c) => ESTADOS_ACTIVOS.includes(c.status));
  const agendadoHoy = activas.reduce(
    (a, c) =>
      a +
      (c.priceOverride ?? c.service.price) +
      c.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    0,
  );
  const cobradoHoy = ventasHoy.reduce(
    (a, v) => a + v.items.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0),
    0,
  );

  // Solo lo que de verdad reclama a una persona. Un cero no se muestra: una
  // lista de alertas apagadas enseña a ignorar la zona donde aparecen.
  const alertas = [
    porConfirmar > 0 && {
      tono: "ambar" as const,
      titulo: porConfirmar === 1 ? "1 cita por confirmar" : `${porConfirmar} citas por confirmar`,
      detalle: "Entraron por el sitio y nadie las ha confirmado.",
      href: "/admin/agenda?vista=lista",
      accion: "Ver agenda",
    },
  ].filter(Boolean) as {
    tono: "rojo" | "ambar";
    titulo: string;
    detalle: string;
    href: string;
    accion: string;
  }[];

  const nombre = user.name.split(" ")[0];
  const proximas = activas.filter((c) => c.endsAt >= new Date()).slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Hola, ${nombre}`}
        description={
          alertas.length === 0
            ? "No hay nada pendiente. Así se ve un día al día."
            : "Esto es lo que está esperando a alguien hoy."
        }
      />

      {/* --- Lo que reclama a una persona --- */}
      {alertas.length > 0 && (
        <div className="mb-8 space-y-3">
          {alertas.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                a.tono === "rojo"
                  ? "border-red-200 bg-red-50 hover:border-red-400"
                  : "border-gold-300/70 bg-gold-50 hover:border-terra"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  a.tono === "rojo" ? "bg-red-500" : "bg-terra"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{a.titulo}</span>
                <span className="mt-0.5 block text-xs text-muted">{a.detalle}</span>
              </span>
              <span className="shrink-0 text-[10px] tracking-[0.16em] text-terra uppercase">
                {a.accion} →
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* --- El día en cifras --- */}
      <div className="grid gap-px border border-stone bg-stone sm:grid-cols-4">
        <Cifra valor={String(activas.length)} etiqueta="citas hoy" />
        <Cifra valor={String(porConfirmar)} etiqueta="por confirmar" alerta={porConfirmar > 0} />
        <Cifra valor={formatCOP(agendadoHoy)} etiqueta="agendado hoy" />
        <Cifra valor={formatCOP(cobradoHoy)} etiqueta="cobrado en caja" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/admin/agenda" className="btn btn-primary px-5 py-2.5 text-sm">
          Abrir la agenda
        </Link>
        <Link href="/admin/ventas/nuevo" className="btn btn-outline px-5 py-2.5 text-sm">
          Nueva venta
        </Link>
      </div>

      {/* --- Lo que viene hoy --- */}
      <div className="mt-8 admin-card bg-paper">
        <div className="admin-card-header">
          <p className="admin-kicker mb-2">Agenda de hoy</p>
          <h2 className="t-card text-ink">
            {proximas.length > 0 ? "Lo que viene" : "Nada más por hoy"}
          </h2>
        </div>

        {proximas.length === 0 ? (
          <p className="px-6 py-8 text-sm font-normal text-muted">
            {activas.length > 0
              ? "Todas las citas de hoy ya pasaron."
              : "No hay citas agendadas para hoy."}
          </p>
        ) : (
          <ul className="divide-y divide-stone/50">
            {proximas.map((c) => (
              <li key={c.id}>
                <Link
                  href="/admin/agenda"
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 transition-colors hover:bg-sand/40"
                >
                  <span className="w-14 shrink-0 font-mono text-sm text-ink tabular-nums">
                    {horaBogota(c.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {c.clientName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {c.service.name}
                      {c.staff ? ` · ${c.staff.name}` : ""}
                      {!sedeId ? ` · ${c.branch.city}` : ""}
                    </span>
                  </span>
                  <Badge tone={TONO[c.status] ?? "neutral"}>
                    {ETIQUETA[c.status] ?? c.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Estado del sitio, al final porque es lo que menos urge --- */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <MiniCard
          href="/admin/servicios"
          kicker="Catálogo"
          valor={String(servicios)}
          etiqueta="servicios activos"
        />
        <MiniCard
          href="/admin/productos"
          kicker="Catálogo"
          valor={String(productos)}
          etiqueta="productos activos"
        />
        <MiniCard
          href="/admin/medios"
          kicker="Contenido"
          valor={`${espaciosLlenos}/${espacios}`}
          etiqueta="espacios de medios con material"
        />
      </div>

      {/* --- Lo que todavía no existe --- */}
      {Object.keys(PHASE_FLAGS).length > 0 && (
        <div className="mt-8 admin-card bg-cream">
          <div className="admin-card-header">
            <p className="admin-kicker mb-2">Próximamente</p>
            <h2 className="t-card text-ink">Lo que todavía no existe</h2>
          </div>
          <ul className="divide-y divide-stone/50">
            {Object.entries(PHASE_FLAGS).map(([key, flag]) => (
              <li key={key} className="px-6 py-3.5">
                <p className="text-sm font-medium text-ink">{flag.label}</p>
                <p className="mt-0.5 text-xs text-muted">{flag.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Cifra({
  valor,
  etiqueta,
  alerta,
}: {
  valor: string;
  etiqueta: string;
  alerta?: boolean;
}) {
  return (
    <div className="bg-white px-6 py-5">
      <p className={`display text-3xl ${alerta ? "text-terra" : "text-ink"}`}>{valor}</p>
      <p className="t-small mt-1">{etiqueta}</p>
    </div>
  );
}

function MiniCard({
  href,
  kicker,
  valor,
  etiqueta,
}: {
  href: string;
  kicker: string;
  valor: string;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      className="admin-card bg-paper px-6 py-5 transition-transform hover:-translate-y-0.5"
    >
      <p className="admin-kicker mb-2">{kicker}</p>
      <p className="display text-3xl text-ink">{valor}</p>
      <p className="mt-1 text-xs font-normal text-muted">{etiqueta}</p>
    </Link>
  );
}
