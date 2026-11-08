import "server-only";

import { prisma } from "@/lib/db";

/**
 * Motor de disponibilidad de la agenda.
 *
 * Colombia no tiene horario de verano, así que se trabaja con un desfase fijo
 * de -05:00. Las fechas se guardan en UTC y se calculan en hora de Bogotá.
 */

const OFFSET_BOGOTA = -5;
/** Cada cuántos minutos se ofrece una hora de inicio. */
const PASO_MINUTOS = 15;

export const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADA", "ATENDIDA"];

/* --- Fechas ---------------------------------------------------------------- */

/** "2026-08-15" + "09:30" (hora Bogotá) → Date en UTC. */
export function aUtc(fecha: string, hora: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hh - OFFSET_BOGOTA, mm));
}

/** Date → "2026-08-15" en hora de Bogotá. */
export function fechaBogota(d: Date) {
  const local = new Date(d.getTime() + OFFSET_BOGOTA * 3600_000);
  return local.toISOString().slice(0, 10);
}

/** Date → "09:30" en hora de Bogotá. */
export function horaBogota(d: Date) {
  const local = new Date(d.getTime() + OFFSET_BOGOTA * 3600_000);
  return local.toISOString().slice(11, 16);
}

/** Día de la semana en Bogotá: 0 = domingo. */
export function diaSemanaBogota(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function hoyBogota() {
  return fechaBogota(new Date());
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number) {
  const [a, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/* --- Disponibilidad -------------------------------------------------------- */

type Ocupado = { startsAt: Date; endsAt: Date };
/** Cita ocupando la agenda de un profesional concreto (o sin asignar). */
type OcupadoDe = Ocupado & { staffId: string | null };
/** Bloqueo de agenda de un profesional concreto. */
type BloqueoDe = Ocupado & { staffId: string };

/** Un profesional y su horario para un día de la semana concreto. */
type Profesional = {
  id: string;
  order: number;
  apertura: string;
  /** Hora de la ÚLTIMA CITA: a esa hora todavía se puede empezar un servicio,
   * aunque termine después. Así lo maneja el salón ("9 a 5:50 última cita"). */
  cierre: string;
  cerrado: boolean;
  /** Horas habilitadas ese día por fuera del horario semanal, en minutos del
   * día: se puede empezar una cita desde `ini` hasta antes de `fin`. */
  extras: { ini: number; fin: number }[];
};

/** ¿Una cita que empieza en el minuto `m` cabe en el horario de `p`? */
const dentroDeHorario = (p: Profesional, m: number) =>
  (!p.cerrado && m >= minutos(p.apertura) && m <= minutos(p.cierre)) ||
  p.extras.some((e) => m >= e.ini && m < e.fin);

/** Horas habilitadas de una profesional que caen en `fecha`, en minutos. */
function extrasDelDia(extras: BloqueoDe[], staffId: string, fecha: string) {
  const inicioDia = aUtc(fecha, "00:00").getTime();
  const finDia = inicioDia + 24 * 3600_000;
  return extras
    .filter((e) => e.staffId === staffId && e.startsAt.getTime() < finDia && e.endsAt.getTime() > inicioDia)
    .map((e) => ({
      ini: Math.round((Math.max(e.startsAt.getTime(), inicioDia) - inicioDia) / 60_000),
      fin: Math.round((Math.min(e.endsAt.getTime(), finDia) - inicioDia) / 60_000),
    }));
}

/** Horas de inicio posibles: la grilla de 15 min más la última cita exacta
 * cuando no cae en la grilla (9:00 + 15 min nunca da 5:50). */
function inicios(desde: number, hasta: number) {
  const lista: number[] = [];
  for (let m = desde; m <= hasta; m += PASO_MINUTOS) lista.push(m);
  if (lista[lista.length - 1] !== hasta) lista.push(hasta);
  return lista;
}

type Config = {
  minHorasAntes: number;
  maxDiasAdelante: number;
};

export async function configAgenda(): Promise<Config> {
  const filas = await prisma.setting.findMany({
    where: { key: { in: ["booking.minHoursAhead", "booking.maxDaysAhead"] } },
  });
  const mapa = new Map(filas.map((f) => [f.key, Number(f.value)]));
  return {
    minHorasAntes: Number.isFinite(mapa.get("booking.minHoursAhead"))
      ? (mapa.get("booking.minHoursAhead") as number)
      : 3,
    maxDiasAdelante: Number.isFinite(mapa.get("booking.maxDaysAhead"))
      ? (mapa.get("booking.maxDaysAhead") as number)
      : 60,
  };
}

/** Profesionales activos de una sede que hacen un servicio, con su horario por día de la semana. */
export async function profesionalesDelServicio(branchId: string, serviceId: string) {
  const asignados = await prisma.teamMember.findMany({
    where: { branchId, active: true, services: { some: { serviceId } } },
    select: { id: true, order: true, schedule: true },
  });

  // Algunos servicios migrados quedaron reservables sin filas de StaffService.
  // Solo en ese caso usamos el equipo activo de la sede; las asignaciones
  // existentes siguen siendo la fuente de verdad para no ampliar servicios
  // configurados de forma explícita.
  if (asignados.length > 0) return asignados;

  return prisma.teamMember.findMany({
    where: { branchId, active: true },
    select: { id: true, order: true, schedule: true },
  });
}

/**
 * Un horario está libre si al menos un profesional calificado está
 * disponible: dentro de su horario ese día, sin una cita propia ni un
 * bloqueo personal que se solape. Las citas sin profesional asignado
 * (agendadas antes de este modelo) restan cupo genérico, para no exponer
 * como libre un horario que en la práctica ya está tomado.
 */
export function calcularHoras({
  fecha,
  duracion,
  profesionales,
  ocupados,
  bloqueosSede,
  bloqueosPersonales,
  ahora,
  minHorasAntes,
}: {
  fecha: string;
  duracion: number;
  profesionales: Profesional[];
  ocupados: OcupadoDe[];
  bloqueosSede: Ocupado[];
  bloqueosPersonales: BloqueoDe[];
  ahora: Date;
  minHorasAntes: number;
}) {
  const libres: string[] = [];
  const abiertos = profesionales.filter((p) => !p.cerrado || p.extras.length > 0);
  if (abiertos.length === 0) return libres;

  // El rango del día cubre el horario de cada una y sus horas habilitadas.
  const bordes = abiertos.flatMap((p) => [
    ...(p.cerrado ? [] : [{ ini: minutos(p.apertura), fin: minutos(p.cierre) }]),
    ...p.extras.map((e) => ({ ini: e.ini, fin: e.fin - PASO_MINUTOS })),
  ]);
  const desde = Math.min(...bordes.map((b) => b.ini));
  const hasta = Math.max(...bordes.map((b) => b.fin));
  const limite = new Date(ahora.getTime() + minHorasAntes * 3600_000);

  for (const m of inicios(desde, hasta)) {
    const hora = aHora(m);
    const inicio = aUtc(fecha, hora);
    const fin = new Date(inicio.getTime() + duracion * 60_000);

    if (inicio < limite) continue;

    // Un bloqueo de sede cierra la agenda por completo en ese rango.
    if (bloqueosSede.some((b) => inicio < b.endsAt && fin > b.startsAt)) continue;

    const disponibles = abiertos.filter((p) => {
      if (!dentroDeHorario(p, m)) return false;
      const ocupado = ocupados.some(
        (o) => o.staffId === p.id && inicio < o.endsAt && fin > o.startsAt,
      );
      if (ocupado) return false;
      const bloqueado = bloqueosPersonales.some(
        (b) => b.staffId === p.id && inicio < b.endsAt && fin > b.startsAt,
      );
      return !bloqueado;
    });

    if (disponibles.length === 0) continue;

    // Citas viejas sin profesional asignado: restan cupo genérico porque
    // no sabemos a cuál de los disponibles le pertenecen en realidad.
    const genericas = ocupados.filter(
      (o) => o.staffId === null && inicio < o.endsAt && fin > o.startsAt,
    ).length;

    if (disponibles.length > genericas) libres.push(hora);
  }

  return libres;
}

/** Trae las citas y bloqueos de un rango, listos para `calcularHoras`. */
async function ocupacionDelRango(
  branchId: string,
  desde: Date,
  hasta: Date,
  excluirCitaId?: string,
) {
  const [ocupados, bloqueosSede, bloqueosPersonales, extras] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        branchId,
        status: { in: ESTADOS_ACTIVOS },
        ...(excluirCitaId ? { id: { not: excluirCitaId } } : {}),
        startsAt: { lt: hasta },
        endsAt: { gt: desde },
      },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { branchId, staffId: null, startsAt: { lt: hasta }, endsAt: { gt: desde } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        branchId,
        staffId: { not: null },
        startsAt: { lt: hasta },
        endsAt: { gt: desde },
      },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    prisma.staffExtraHours.findMany({
      where: { branchId, startsAt: { lt: hasta }, endsAt: { gt: desde } },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
  ]);

  return {
    ocupados,
    bloqueosSede,
    bloqueosPersonales: bloqueosPersonales as BloqueoDe[],
    extras,
  };
}

function aProfesional(
  staff: { id: string; order: number; schedule: { weekday: number; opensAt: string; closesAt: string; closed: boolean }[] },
  fecha: string,
  extras: BloqueoDe[],
): Profesional {
  const h = staff.schedule.find((s) => s.weekday === diaSemanaBogota(fecha));
  return {
    extras: extrasDelDia(extras, staff.id, fecha),
    id: staff.id,
    order: staff.order,
    apertura: h?.opensAt ?? "00:00",
    cierre: h?.closesAt ?? "00:00",
    cerrado: !h || h.closed,
  };
}

/** Si la clienta eligió profesional, el cálculo se hace solo con ella. Una
 * profesional que no hace el servicio (o que no existe) deja la lista vacía. */
function soloElegida<T extends { id: string }>(staff: T[], staffId?: string | null) {
  return staffId ? staff.filter((s) => s.id === staffId) : staff;
}

/** Horas libres de un día concreto.
 *
 * `opciones` es para reagendar desde el panel: la cita que se mueve no se
 * cuenta como ocupada, se usa su duración real (con lo que se le haya
 * sumado) y no se exige la anticipación mínima que se le pide a la web. */
export async function horasLibres(
  branchId: string,
  serviceId: string,
  fecha: string,
  opciones: {
    excluirCitaId?: string;
    duracion?: number;
    sinAnticipacion?: boolean;
    /** Solo las horas de esta profesional (la clienta la eligió en la web). */
    staffId?: string | null;
  } = {},
) {
  const [servicio, todos, cfg] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    profesionalesDelServicio(branchId, serviceId),
    configAgenda(),
  ]);
  const staff = soloElegida(todos, opciones.staffId);

  if (!servicio || staff.length === 0) return [];

  const inicioDia = aUtc(fecha, "00:00");
  const finDia = new Date(inicioDia.getTime() + 24 * 3600_000);

  const { ocupados, bloqueosSede, bloqueosPersonales, extras } = await ocupacionDelRango(
    branchId,
    inicioDia,
    finDia,
    opciones.excluirCitaId,
  );

  return calcularHoras({
    fecha,
    duracion: opciones.duracion ?? servicio.durationMin,
    profesionales: staff.map((s) => aProfesional(s, fecha, extras)),
    ocupados,
    bloqueosSede,
    bloqueosPersonales,
    ahora: new Date(),
    minHorasAntes: opciones.sinAnticipacion ? 0 : cfg.minHorasAntes,
  });
}

/**
 * Qué días de un rango tienen al menos una hora libre.
 * Trae todo de una vez para no golpear la base por cada día.
 */
export async function diasConCupo(
  branchId: string,
  serviceId: string,
  desde: string,
  dias: number,
  /** Para mover una cita: no se cuenta a sí misma y usa su duración real.
   * `staffId`: solo los días con cupo de esa profesional. */
  opciones: { excluirCitaId?: string; duracion?: number; staffId?: string | null } = {},
) {
  const [servicio, todos, cfg] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    profesionalesDelServicio(branchId, serviceId),
    configAgenda(),
  ]);
  const staff = soloElegida(todos, opciones.staffId);

  if (!servicio || staff.length === 0) return {};

  const hasta = sumarDias(desde, dias);
  const inicioRango = aUtc(desde, "00:00");
  const finRango = aUtc(hasta, "23:59");

  const { ocupados, bloqueosSede, bloqueosPersonales, extras } = await ocupacionDelRango(
    branchId,
    inicioRango,
    finRango,
    opciones.excluirCitaId,
  );

  const ahora = new Date();
  const resultado: Record<string, number> = {};

  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(desde, i);

    resultado[fecha] = calcularHoras({
      fecha,
      duracion: opciones.duracion ?? servicio.durationMin,
      profesionales: staff.map((s) => aProfesional(s, fecha, extras)),
      ocupados,
      bloqueosSede,
      bloqueosPersonales,
      ahora,
      minHorasAntes: cfg.minHorasAntes,
    }).length;
  }

  return resultado;
}

/**
 * Elige el profesional que atenderá una cita nueva: entre los calificados
 * y libres a esa hora exacta, el que tenga menos citas activas ese día
 * (reparto parejo), desempatando por `order`. `null` si nadie califica o
 * está libre — incluye el caso de que citas sin asignar ya hayan copado
 * el cupo genérico disponible.
 */
export async function asignarProfesional(
  branchId: string,
  serviceId: string,
  fecha: string,
  hora: string,
  /** Al mover una cita: no choca consigo misma, usa su duración real y, si
   * su profesional sigue libre, se queda con ella. */
  opciones: {
    excluirCitaId?: string;
    duracion?: number;
    preferir?: string | null;
    /** Obligatoria: si esa profesional no está libre, no se asigna a otra. */
    staffId?: string | null;
  } = {},
): Promise<string | null> {
  const [servicio, todos] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    profesionalesDelServicio(branchId, serviceId),
  ]);
  const staff = soloElegida(todos, opciones.staffId);

  if (!servicio || staff.length === 0) return null;

  const inicio = aUtc(fecha, hora);
  const fin = new Date(inicio.getTime() + (opciones.duracion ?? servicio.durationMin) * 60_000);
  const inicioDia = aUtc(fecha, "00:00");
  const finDia = new Date(inicioDia.getTime() + 24 * 3600_000);

  const { ocupados, bloqueosSede, bloqueosPersonales, extras } = await ocupacionDelRango(
    branchId,
    inicioDia,
    finDia,
    opciones.excluirCitaId,
  );

  if (bloqueosSede.some((b) => inicio < b.endsAt && fin > b.startsAt)) return null;

  const m = minutos(hora);
  const candidatos = staff
    .map((s) => aProfesional(s, fecha, extras))
    .filter((p) => {
      if (!dentroDeHorario(p, m)) return false;
      const ocupado = ocupados.some(
        (o) => o.staffId === p.id && inicio < o.endsAt && fin > o.startsAt,
      );
      if (ocupado) return false;
      const bloqueado = bloqueosPersonales.some(
        (b) => b.staffId === p.id && inicio < b.endsAt && fin > b.startsAt,
      );
      return !bloqueado;
    });

  const genericas = ocupados.filter(
    (o) => o.staffId === null && inicio < o.endsAt && fin > o.startsAt,
  ).length;

  if (candidatos.length === 0 || candidatos.length <= genericas) return null;
  if (opciones.preferir && candidatos.some((c) => c.id === opciones.preferir)) return opciones.preferir;

  const citasHoy = new Map(
    candidatos.map((c) => [
      c.id,
      ocupados.filter((o) => o.staffId === c.id).length,
    ]),
  );
  candidatos.sort(
    (a, b) => citasHoy.get(a.id)! - citasHoy.get(b.id)! || a.order - b.order,
  );

  return candidatos[0].id;
}

/**
 * ¿Este horario choca con algo activo? Se usa al guardar una reserva creada
 * o editada a mano desde el panel — a diferencia de `asignarProfesional`
 * (que escanea muchos candidatos de una sola vez para armar la grilla de
 * horas libres), esto revisa un profesional y un horario puntual ya
 * elegidos, así que sí vale la pena consultarlo directo.
 * `excludeAppointmentId` se usa al reprogramar: la cita no choca consigo misma.
 */
export async function hayConflicto(
  branchId: string,
  staffId: string | null,
  inicio: Date,
  fin: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const [citaSolapada, bloqueoSede, bloqueoPersonal] = await Promise.all([
    staffId
      ? prisma.appointment.findFirst({
          where: {
            staffId,
            status: { in: ESTADOS_ACTIVOS },
            startsAt: { lt: fin },
            endsAt: { gt: inicio },
            ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
          },
          select: { id: true },
        })
      : null,
    prisma.timeOff.findFirst({
      where: { branchId, staffId: null, startsAt: { lt: fin }, endsAt: { gt: inicio } },
      select: { id: true },
    }),
    staffId
      ? prisma.timeOff.findFirst({
          where: { staffId, startsAt: { lt: fin }, endsAt: { gt: inicio } },
          select: { id: true },
        })
      : null,
  ]);

  return Boolean(citaSolapada || bloqueoSede || bloqueoPersonal);
}

/**
 * Sedes, servicios reservables y clientes recientes — para poblar los
 * selectores del formulario de reserva manual del panel admin (crear/editar
 * en `/admin/agenda`, y desde la ficha de un cliente en `/admin/clientes`).
 */
export async function lookupsReservaAdmin() {
  const [sedes, servicios, productos, clientesRecientes, equipo] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, city: true },
    }),
    // Todos los activos: los que no son reservables en línea (los de color,
    // con abono) los agenda el equipo desde acá.
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true, durationMin: true, branchId: true },
      orderBy: { name: "asc" },
    }),
    // Sin filtrar por `purchasable`: ese flag es para la tienda online
    // pública (Fase 2), no para vender un producto desde el panel.
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
    // Con las más recientes basta para el autocompletar — no hace falta el
    // histórico completo.
    prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { clientName: true, clientPhone: true, clientEmail: true },
    }),
    prisma.teamMember.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
  ]);

  const vistos = new Set<string>();
  const clientes: { name: string; phone: string; email: string | null }[] = [];
  for (const c of clientesRecientes) {
    if (vistos.has(c.clientPhone)) continue;
    vistos.add(c.clientPhone);
    clientes.push({ name: c.clientName, phone: c.clientPhone, email: c.clientEmail });
  }

  return { sedes, servicios, productos, clientes, equipo };
}

/** Código corto y legible para la clienta: MR-7K3Q. */
export function generarCodigo() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let s = "";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `MR-${s}`;
}
