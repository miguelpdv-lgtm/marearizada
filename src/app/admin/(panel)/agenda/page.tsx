import Link from "next/link";

import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import {
  liberarVencidas,
  ESTADOS_ACTIVOS,
  aUtc,
  diaSemanaBogota,
  fechaBogota,
  horaBogota,
  hoyBogota,
  lookupsReservaAdmin,
  sumarDias,
} from "@/lib/agenda";
import { formatCOP } from "@/lib/format";
import { cambiarEstado } from "./actions";
import { ETIQUETA, TONO } from "./estado";
import { SemanaGrid, type BloqueoSemana, type CitaSemana } from "./SemanaGrid";
import {
  AgendaProfesionales,
  type CitaProfesional,
  type FranjaHabilitada,
  type FranjaNoDisponible,
  type Profesional,
} from "./AgendaProfesionales";
import { NuevaReservaButton } from "./NuevaReservaButton";
import type { Lookups } from "./ReservaForm";
import type { ItemDTO } from "./items-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agenda" };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function tituloDia(fecha: string, hoy: string) {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  const [a, m, d] = fecha.split("-").map(Number);
  const dia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][
    new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  ];
  return `${dia} ${d} de ${MESES[m - 1]}`;
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Precio base (servicio, con su override) + todo lo vendido dentro de la
 * cita (servicios/productos adicionales). */
function totalCita(c: {
  priceOverride: number | null;
  service: { price: number };
  items: { unitPrice: number; quantity: number }[];
}) {
  const base = c.priceOverride ?? c.service.price;
  return base + c.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
}

/** Forma cruda de `AppointmentItem` tal como viene de Prisma (`kind` es
 * `string`, no el literal `"SERVICE" | "PRODUCT"` que espera el cliente). */
type RawItem = {
  id: string;
  kind: string;
  name: string;
  quantity: number;
  unitPrice: number;
  durationMin: number | null;
  staffId: string | null;
  staff?: { name: string } | null;
};

const aItemDTO = (items: RawItem[]): ItemDTO[] =>
  items.map(({ staff, ...i }) => ({
    ...i,
    kind: i.kind as ItemDTO["kind"],
    staffName: staff?.name ?? null,
  }));

/**
 * Amplía el rango visible del calendario para que quepa toda cita.
 *
 * El rango sale del horario del local o de las profesionales, pero las citas
 * no siempre caen dentro: el histórico de AgendaPro trae citas a las 8:00 en
 * días que abren a las 9:00, y alguien puede agendar a mano fuera de horario.
 * Sin esto, esas citas quedaban con posición negativa y se dibujaban encima
 * del encabezado, tapando las fotos de las profesionales. Se redondea a la
 * hora para que la rejilla siga empezando en una línea limpia.
 */
function abarcarCitas(
  desdeMin: number,
  hastaMin: number,
  citas: { startsAt: Date; endsAt: Date }[],
) {
  let desde = desdeMin;
  let hasta = hastaMin;
  for (const c of citas) {
    const ini = aMinutos(horaBogota(c.startsAt));
    const fin = aMinutos(horaBogota(c.endsAt));
    // Una cita que cruza la medianoche (fin < inicio) no amplía nada.
    if (ini < desde) desde = Math.floor(ini / 60) * 60;
    if (fin > ini && fin > hasta) hasta = Math.ceil(fin / 60) * 60;
  }
  return { desdeMin: desde, hastaMin: hasta };
}

/** Lunes de la semana que contiene esa fecha. */
function lunesDe(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return sumarDias(fecha, dow === 0 ? -6 : 1 - dow);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    desde?: string;
    dias?: string;
    sede?: string;
    profesional?: string;
    linea?: string;
  }>;
}) {
  const sp = await searchParams;
  const hoy = hoyBogota();
  const vista =
    // Por profesionales de entrada: es la vista con la que se trabaja el día —
    // quién atiende a quién y quién está libre—. Semana y lista siguen a un
    // clic para planear o buscar.
    sp.vista === "lista" ? "lista" : sp.vista === "semana" ? "semana" : "profesionales";

  const user = await requireUser();
  // Las reservas en línea que no pagaron el abono a tiempo sueltan su cupo.
  await liberarVencidas();
  const lookupsCompletos = await lookupsReservaAdmin();
  const permitidas = sedesPermitidas(user, lookupsCompletos.sedes);
  const lookups = { ...lookupsCompletos, sedes: permitidas };
  const sedes = lookups.sedes;

  const sedeId = sedeEfectiva(permitidas, sp.sede);
  // La vista por profesionales necesita una sede concreta (cada quien
  // pertenece a una sola sede): si no hay una elegida, se asume la primera.
  const sedeVista = vista === "profesionales" ? (sedeId ?? sedes[0]?.id) : sedeId;
  // Sin sede elegida, se filtra a las permitidas (nunca "sin filtro": un
  // usuario sin ninguna sede asignada no debe ver nada).
  const filtroSede = sedeVista
    ? { branchId: sedeVista }
    : { branchId: { in: permitidas.map((s) => s.id) } };

  const inicio =
    sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde) ? sp.desde : hoy;

  const desde = vista === "semana" ? lunesDe(inicio) : inicio;
  const rango =
    vista === "semana" ? 7 : vista === "profesionales" ? 1 : Math.min(Number(sp.dias) || 14, 60);

  // Un solo local con dos líneas: la agenda se mira por Salón o por Nails.
  // Cada línea es una categoría de servicios; su equipo, quien presta alguno.
  const categorias = await prisma.serviceCategory.findMany({
    where: { active: true, services: { some: { active: true } } },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  const lineas = categorias.map((c) => ({
    id: c.id,
    nombre: /nail|uña/i.test(c.name) ? "Nails" : /rizo/i.test(c.name) ? "Salón" : c.name,
  }));
  const lineaId =
    lineas.length > 1 ? (lineas.find((l) => l.id === sp.linea)?.id ?? lineas[0].id) : undefined;
  const filtroLineaCita = lineaId ? { service: { categoryId: lineaId } } : {};
  const filtroLineaEquipo = lineaId ? { services: { some: { service: { categoryId: lineaId } } } } : {};

  const [citas, bloqueosTodos, horarios, equipo, scheduleTodo, habilitadasTodas] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...filtroSede,
        ...filtroLineaCita,
        staffId: sp.profesional || undefined,
        startsAt: {
          gte: aUtc(desde, "00:00"),
          lt: aUtc(sumarDias(desde, rango), "00:00"),
        },
      },
      orderBy: { startsAt: "asc" },
      include: {
        service: { select: { name: true, price: true } },
        branch: { select: { city: true } },
        staff: { select: { name: true } },
        items: { orderBy: { createdAt: "asc" }, include: { staff: { select: { name: true } } } },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        ...filtroSede,
        startsAt: { lt: aUtc(sumarDias(desde, rango), "00:00") },
        endsAt: { gt: aUtc(desde, "00:00") },
      },
    }),
    prisma.businessHour.findMany({ where: sedeVista ? { branchId: sedeVista } : {} }),
    sedeVista || permitidas.length > 0
      ? prisma.teamMember.findMany({
          where: {
            branchId: sedeVista ? sedeVista : { in: permitidas.map((s) => s.id) },
            active: true,
            ...filtroLineaEquipo,
          },
          orderBy: { order: "asc" },
          select: { id: true, name: true, imageUrl: true },
        })
      : Promise.resolve([]),
    vista === "profesionales" && sedeVista
      ? prisma.staffSchedule.findMany({
          where: { weekday: diaSemanaBogota(desde), staff: { branchId: sedeVista, active: true } },
        })
      : Promise.resolve([]),
    vista === "profesionales" && sedeVista
      ? prisma.staffExtraHours.findMany({
          where: {
            branchId: sedeVista,
            startsAt: { lt: aUtc(sumarDias(desde, 1), "00:00") },
            endsAt: { gt: aUtc(desde, "00:00") },
          },
        })
      : Promise.resolve([]),
  ]);

  // Bloqueos de todo el local se ven en las dos líneas; los personales y los
  // horarios, solo si la profesional es de la línea.
  const delEquipo = new Set(equipo.map((e) => e.id));
  const bloqueos = bloqueosTodos.filter((b) => !b.staffId || delEquipo.has(b.staffId));
  const staffSchedule = scheduleTodo.filter((h) => delEquipo.has(h.staffId));
  const habilitadas = habilitadasTodas.filter((h) => !h.staffId || delEquipo.has(h.staffId));

  const activas = citas.filter((c) => ESTADOS_ACTIVOS.includes(c.status));
  const ingresos = activas.reduce((a, c) => a + totalCita(c), 0);

  const enlace = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { vista, desde, sede: sedeId, profesional: sp.profesional, linea: lineaId, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/admin/agenda?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Las reservas en línea entran confirmadas cuando se paga el abono. Cambia entre Salón y Nails para ver cada agenda."
        action={{ label: "Bloqueo de horas", href: "/admin/agenda/bloqueos" }}
      />

      <div className="mb-6 flex justify-end">
        <NuevaReservaButton
          lookups={lookups}
          sedePorDefecto={sedeVista ?? sedes[0]?.id}
          fechaPorDefecto={vista === "semana" ? hoy : inicio}
        />
      </div>

      {/* Controles */}
      {lineas.length > 1 && (
        <div className="mb-4 inline-flex border-2 border-ink" role="tablist" aria-label="Agenda de">
          {lineas.map((l) => (
            <Link
              key={l.id}
              role="tab"
              aria-selected={l.id === lineaId}
              href={enlace({ linea: l.id, profesional: undefined })}
              className={`px-6 py-2.5 text-sm font-bold tracking-[0.1em] uppercase transition-colors ${
                l.id === lineaId ? "bg-ink text-gold-500" : "bg-paper text-ink hover:bg-cream"
              }`}
            >
              {l.nombre}
            </Link>
          ))}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex">
          {(["profesionales", "semana", "lista"] as const).map((v) => (
            <Link
              key={v}
              href={enlace({ vista: v, desde: v === "semana" ? lunesDe(hoy) : hoy, profesional: undefined })}
              className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
                vista === v
                  ? "border-ink bg-ink text-gold-500"
                  : "border-stone text-ink hover:border-terra"
              }`}
            >
              {v}
            </Link>
          ))}
        </div>

        {sedes.length > 1 && (
        <div className="flex">
          {vista !== "profesionales" && sedes.length > 1 && (
            <Link
              href={enlace({ sede: undefined })}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                !sedeId ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
              }`}
            >
              Ambas
            </Link>
          )}
          {sedes.map((s) => (
            <Link
              key={s.id}
              href={enlace({ sede: s.id })}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                vista === "profesionales" ? "border-l-0 first:border-l" : "border-l-0"
              } ${
                sedeVista === s.id
                  ? "border-ink bg-ink text-gold-500"
                  : "border-stone text-ink hover:border-terra"
              }`}
            >
              {s.city}
            </Link>
          ))}
        </div>
        )}

        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="sede" value={sedeId ?? ""} />
          {lineaId && <input type="hidden" name="linea" value={lineaId} />}
          <label className="sr-only" htmlFor="fecha-agenda">Fecha</label>
          <input
            id="fecha-agenda"
            type="date"
            name="desde"
            defaultValue={inicio}
            className="admin-control w-auto px-3 py-2 text-sm"
          />
          <label className="sr-only" htmlFor="profesional-agenda">Profesional</label>
          <select
            id="profesional-agenda"
            name="profesional"
            defaultValue={sp.profesional ?? ""}
            className="admin-control w-auto min-w-44 px-3 py-2 text-sm"
          >
            <option value="">Todos los profesionales</option>
            {equipo.map((profesional) => (
              <option key={profesional.id} value={profesional.id}>{profesional.name}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline rounded-lg px-4 py-2 text-[11px]">Aplicar</button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={enlace({ desde: sumarDias(desde, -rango) })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone text-ink transition-colors hover:border-terra"
            aria-label="Anterior"
          >
            ←
          </Link>
          <Link
            href={enlace({ desde: vista === "semana" ? lunesDe(hoy) : hoy })}
            className="rounded-lg border border-stone px-4 py-2 text-sm text-ink transition-colors hover:border-terra"
          >
            Hoy
          </Link>
          <Link
            href={enlace({ desde: sumarDias(desde, rango) })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone text-ink transition-colors hover:border-terra"
            aria-label="Siguiente"
          >
            →
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="mb-8 grid gap-px border border-stone bg-stone sm:grid-cols-3">
        <div className="bg-white px-6 py-5">
          <p className="display text-3xl text-ink">{activas.length}</p>
          <p className="t-small mt-1">reservas activas</p>
        </div>
        <div className="bg-white px-6 py-5">
          <p className="display text-3xl text-ink">
            {citas.filter((c) => c.status === "PENDIENTE").length}
          </p>
          <p className="t-small mt-1">por confirmar</p>
        </div>
        <div className="bg-white px-6 py-5">
          <p className="display text-3xl text-ink">{formatCOP(ingresos)}</p>
          <p className="t-small mt-1">valor agendado</p>
        </div>
      </div>

      {vista === "semana" ? (
        <VistaSemana
          desde={desde}
          hoy={hoy}
          citas={citas}
          bloqueos={bloqueos}
          horarios={horarios}
          lookups={lookups}
        />
      ) : vista === "profesionales" ? (
        <VistaProfesionales
          branchId={sedeVista ?? ""}
          desde={desde}
          hoy={hoy}
          citas={citas}
          bloqueos={bloqueos}
          equipo={equipo}
          staffSchedule={staffSchedule}
          habilitadas={habilitadas}
          lookups={lookups}
        />
      ) : (
        <VistaLista citas={citas} hoy={hoy} />
      )}
    </>
  );
}

/* --- Semana ---------------------------------------------------------------- */

type Citas = Parameters<typeof VistaLista>[0]["citas"];

function VistaSemana({
  desde,
  hoy,
  citas,
  bloqueos,
  horarios,
  lookups,
}: {
  desde: string;
  hoy: string;
  citas: (Citas[number] & {
    staff: { name: string } | null;
    clientEmail: string | null;
    branchId: string;
    serviceId: string;
    staffId: string | null;
    priceOverride: number | null;
    paymentMethod: string | null;
    depositPaid: number;
    internalNotes: string | null;
    items: RawItem[];
  })[];
  bloqueos: { id: string; startsAt: Date; endsAt: Date; reason: string | null }[];
  horarios: { opensAt: string; closesAt: string; closed: boolean }[];
  lookups: Lookups;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));

  // La rejilla arranca en la apertura más temprana y termina en el cierre más tarde.
  const abiertos = horarios.filter((h) => !h.closed);
  const { desdeMin, hastaMin } = abarcarCitas(
    abiertos.length ? Math.min(...abiertos.map((h) => aMinutos(h.opensAt))) : 8 * 60,
    abiertos.length ? Math.max(...abiertos.map((h) => aMinutos(h.closesAt))) : 19 * 60,
    citas,
  );

  const citasSemana: CitaSemana[] = citas.map((c) => ({
    id: c.id,
    code: c.code,
    branchId: c.branchId,
    serviceId: c.serviceId,
    staffId: c.staffId,
    clientName: c.clientName,
    clientPhone: c.clientPhone,
    clientEmail: c.clientEmail,
    notes: c.notes,
    internalNotes: c.internalNotes,
    curlType: c.curlType,
    servicio: c.service.name,
    servicePrice: c.service.price,
    paymentMethod: c.paymentMethod,
    priceOverride: c.priceOverride,
    ciudad: c.branch.city,
    status: c.status,
    profesional: c.staff?.name ?? null,
    dia: fechaBogota(c.startsAt),
    date: fechaBogota(c.startsAt),
    inicioMin: aMinutos(horaBogota(c.startsAt)),
    finMin: aMinutos(horaBogota(c.endsAt)),
    firstVisit: c.firstVisit,
    endsAtIso: c.endsAt.toISOString(),
    items: aItemDTO(c.items),
    depositPaid: c.depositPaid,
  }));

  // Un bloqueo puede abarcar varios días: se parte por día para pintarlo.
  const bloqueosSemana: BloqueoSemana[] = [];
  for (const b of bloqueos) {
    for (const dia of dias) {
      const iniDia = aUtc(dia, "00:00");
      const finDia = aUtc(dia, "23:59");
      if (b.startsAt >= finDia || b.endsAt <= iniDia) continue;

      bloqueosSemana.push({
        id: `${b.id}-${dia}`,
        dia,
        inicioMin: b.startsAt <= iniDia ? 0 : aMinutos(horaBogota(b.startsAt)),
        finMin: b.endsAt >= finDia ? 24 * 60 : aMinutos(horaBogota(b.endsAt)),
        reason: b.reason,
      });
    }
  }

  return (
    <SemanaGrid
      dias={dias}
      citas={citasSemana}
      bloqueos={bloqueosSemana}
      desdeMin={desdeMin}
      hastaMin={hastaMin}
      hoy={hoy}
      lookups={lookups}
    />
  );
}

/* --- Profesionales ----------------------------------------------------------------- */

function VistaProfesionales({
  branchId,
  desde,
  hoy,
  citas,
  bloqueos,
  equipo,
  staffSchedule,
  habilitadas,
  lookups,
}: {
  branchId: string;
  desde: string;
  hoy: string;
  citas: {
    id: string;
    code: string;
    status: string;
    branchId: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    notes: string | null;
    internalNotes: string | null;
    priceOverride: number | null;
    paymentMethod: string | null;
    depositPaid: number;
    curlType: string | null;
    firstVisit: boolean;
    staffId: string | null;
    startsAt: Date;
    endsAt: Date;
    service: { name: string; price: number };
    items: RawItem[];
  }[];
  bloqueos: {
    id: string;
    staffId: string | null;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
  }[];
  equipo: Profesional[];
  staffSchedule: { staffId: string; opensAt: string; closesAt: string; closed: boolean }[];
  habilitadas: { id: string; staffId: string; startsAt: Date; endsAt: Date; reason: string | null }[];
  lookups: Lookups;
}) {
  const iniDia = aUtc(desde, "00:00");
  const finDia = aUtc(desde, "23:59");
  const aMinDelDia = (d: Date, borde: number) =>
    d <= iniDia ? 0 : d >= finDia ? borde : aMinutos(horaBogota(d));

  // Horas abiertas a mano para ese día, fuera del horario semanal.
  const extras: FranjaHabilitada[] = habilitadas
    .filter((h) => equipo.some((p) => p.id === h.staffId))
    .map((h) => ({
      id: h.id,
      staffId: h.staffId,
      inicioMin: aMinDelDia(h.startsAt, 24 * 60),
      finMin: aMinDelDia(h.endsAt, 24 * 60),
      motivo: h.reason,
    }));

  // La rejilla arranca en la apertura más temprana y termina en el cierre
  // más tarde entre quienes trabajan ese día (o sus horas habilitadas).
  const abiertos = staffSchedule.filter((s) => !s.closed);
  const aperturas = [...abiertos.map((s) => aMinutos(s.opensAt)), ...extras.map((e) => e.inicioMin)];
  const cierres = [...abiertos.map((s) => aMinutos(s.closesAt)), ...extras.map((e) => e.finMin - 15)];
  const { desdeMin, hastaMin } = abarcarCitas(
    aperturas.length ? Math.min(...aperturas) : 8 * 60,
    cierres.length ? Math.max(...cierres) : 19 * 60,
    citas,
  );

  // Citas viejas sin profesional asignado no tienen dónde pintarse en esta
  // vista (no sabemos de quién eran); en la práctica ya no debería haber.
  const citasProf: CitaProfesional[] = citas
    .filter((c): c is typeof c & { staffId: string } => c.staffId !== null)
    .map((c) => ({
      id: c.id,
      code: c.code,
      branchId: c.branchId,
      serviceId: c.serviceId,
      clientName: c.clientName,
      clientPhone: c.clientPhone,
      clientEmail: c.clientEmail,
      notes: c.notes,
      internalNotes: c.internalNotes,
      servicio: c.service.name,
      servicePrice: c.service.price,
      paymentMethod: c.paymentMethod,
      priceOverride: c.priceOverride,
      status: c.status,
      staffId: c.staffId,
      date: fechaBogota(c.startsAt),
      inicioMin: aMinutos(horaBogota(c.startsAt)),
      finMin: aMinutos(horaBogota(c.endsAt)),
      firstVisit: c.firstVisit,
      curlType: c.curlType,
      endsAtIso: c.endsAt.toISOString(),
      items: aItemDTO(c.items),
      depositPaid: c.depositPaid,
    }));

  const porStaff = new Map(staffSchedule.map((s) => [s.staffId, s]));
  const fueraDeHorario: FranjaNoDisponible[] = [];

  for (const p of equipo) {
    const h = porStaff.get(p.id);
    if (!h || h.closed) {
      fueraDeHorario.push({
        id: `${p.id}-cerrado`,
        staffId: p.id,
        inicioMin: desdeMin,
        finMin: hastaMin,
        label: "Profesional no disponible",
      });
      continue;
    }
    const abre = aMinutos(h.opensAt);
    // `closesAt` es la hora de la última cita: esa fila todavía es atendible.
    const cierra = aMinutos(h.closesAt) + 15;
    if (abre > desdeMin) {
      fueraDeHorario.push({
        id: `${p.id}-antes`,
        staffId: p.id,
        inicioMin: desdeMin,
        finMin: abre,
        label: "Profesional no disponible",
      });
    }
    if (cierra < hastaMin) {
      fueraDeHorario.push({
        id: `${p.id}-despues`,
        staffId: p.id,
        inicioMin: cierra,
        finMin: hastaMin,
        label: "Profesional no disponible",
      });
    }
  }

  // Lo habilitado a mano le gana al horario: esas horas no se pintan grises.
  const noDisponible: FranjaNoDisponible[] = fueraDeHorario.flatMap((f) =>
    extras
      .filter((e) => e.staffId === f.staffId)
      .reduce<FranjaNoDisponible[]>(
        (trozos, e) =>
          trozos.flatMap((t) =>
            e.finMin <= t.inicioMin || e.inicioMin >= t.finMin
              ? [t]
              : [
                  ...(t.inicioMin < e.inicioMin ? [{ ...t, id: `${t.id}-a${e.id}`, finMin: e.inicioMin }] : []),
                  ...(t.finMin > e.finMin ? [{ ...t, id: `${t.id}-d${e.id}`, inicioMin: e.finMin }] : []),
                ],
          ),
        [f],
      ),
  );

  // Un bloqueo sin profesional afecta a toda la sede; con uno, solo a esa persona.
  for (const b of bloqueos) {
    if (b.startsAt >= finDia || b.endsAt <= iniDia) continue;
    const inicioMin = b.startsAt <= iniDia ? 0 : aMinutos(horaBogota(b.startsAt));
    const finMin = b.endsAt >= finDia ? 24 * 60 : aMinutos(horaBogota(b.endsAt));
    const objetivo = b.staffId ? equipo.filter((p) => p.id === b.staffId) : equipo;
    for (const p of objetivo) {
      noDisponible.push({
        id: `${b.id}-${p.id}`,
        staffId: p.id,
        inicioMin,
        finMin,
        label: b.reason ?? "Bloqueado",
        bloqueo: {
          id: b.id,
          sedeEntera: !b.staffId,
          motivo: b.reason,
          // El rango real, aunque el bloqueo siga otros días.
          desde: `${fechaBogota(b.startsAt)} ${horaBogota(b.startsAt)}`,
          hasta: `${fechaBogota(b.endsAt)} ${horaBogota(b.endsAt)}`,
        },
      });
    }
  }

  const ahoraMin = desde === hoy ? aMinutos(horaBogota(new Date())) : null;

  return (
    <AgendaProfesionales
      branchId={branchId}
      fecha={desde}
      profesionales={equipo}
      citas={citasProf}
      noDisponible={noDisponible}
      habilitadas={extras}
      desdeMin={desdeMin}
      hastaMin={hastaMin}
      ahoraMin={ahoraMin}
      lookups={lookups}
    />
  );
}

/* --- Lista ----------------------------------------------------------------- */

function VistaLista({
  citas,
  hoy,
}: {
  citas: {
    id: string;
    code: string;
    status: string;
    clientName: string;
    clientPhone: string;
    curlType: string | null;
    firstVisit: boolean;
    notes: string | null;
    startsAt: Date;
    endsAt: Date;
    service: { name: string; price: number };
    branch: { city: string };
  }[];
  hoy: string;
}) {
  if (citas.length === 0) {
    return (
      <EmptyState
        title="No hay reservas en este rango"
        description="Las reservas que hagan desde el sitio aparecen aquí."
      />
    );
  }

  const porDia = new Map<string, typeof citas>();
  for (const c of citas) {
    const f = fechaBogota(c.startsAt);
    porDia.set(f, [...(porDia.get(f) ?? []), c]);
  }

  return (
    <div className="space-y-8">
      {[...porDia.entries()].map(([fecha, delDia]) => (
        <section key={fecha}>
          <h2 className="t-card mb-3 border-b border-stone pb-2 text-ink">
            {tituloDia(fecha, hoy)}
            <span className="ml-3 text-xs font-normal text-muted">
              {delDia.length} {delDia.length === 1 ? "reserva" : "reservas"}
            </span>
          </h2>

          <div className="divide-y divide-stone border border-stone bg-white">
            {delDia.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="w-20 shrink-0">
                  <p className="text-lg text-ink">{horaBogota(c.startsAt)}</p>
                  <p className="t-small">{horaBogota(c.endsAt)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    {c.clientName}
                    {c.firstVisit && (
                      <span className="ml-2 bg-gold-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                        Primera vez
                      </span>
                    )}
                  </p>
                  <p className="t-small mt-0.5">
                    {c.service.name} · {c.branch.city}
                  </p>
                  <p className="t-small mt-0.5 text-clay">
                    {c.clientPhone}
                    {c.curlType && ` · rizo ${c.curlType.toLowerCase()}`}
                    {` · ${c.code}`}
                  </p>
                  {c.notes && (
                    <p className="t-small mt-1.5 border-l-2 border-stone pl-2 text-muted">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={TONO[c.status] ?? "neutral"}>
                    {ETIQUETA[c.status] ?? c.status}
                  </Badge>

                  <form action={cambiarEstado} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <select
                      name="estado"
                      defaultValue={c.status}
                      className="border border-stone bg-white px-2 py-1.5 text-xs text-ink focus:border-terra focus:outline-none"
                    >
                      {/* "Atendida" se pone con "Finalizar cita" (genera la venta). */}
                      {Object.entries(ETIQUETA)
                        .filter(([v]) => v !== "ATENDIDA" || c.status === "ATENDIDA")
                        .map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="border border-ink px-3 py-1.5 text-xs text-ink transition-colors hover:bg-ink hover:text-gold-500"
                    >
                      Guardar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
