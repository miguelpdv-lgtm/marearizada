"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import { ESTADOS_ACTIVOS, aUtc, diaSemanaBogota } from "@/lib/agenda";
import { bool, optionalStr, runAction, str, type ActionState } from "@/lib/actions";

const esquema = z
  .object({
    branchId: z.string().min(1, "Elige una sede."),
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de inicio."),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha final."),
    todoElDia: z.boolean(),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/),
    reason: z.string().trim().max(200).optional(),
    staffId: z.string().optional(),
  })
  .refine((d) => d.hasta >= d.desde, {
    message: "La fecha final no puede ser anterior a la inicial.",
    path: ["hasta"],
  })
  .refine((d) => d.todoElDia || d.horaFin > d.horaInicio, {
    message: "La hora final debe ser posterior a la inicial.",
    path: ["horaFin"],
  });

export async function crearBloqueo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const desde = str(formData, "desde");
    const datos = {
      branchId: str(formData, "branchId"),
      desde,
      // Si no ponen fecha final, se bloquea solo ese día.
      hasta: str(formData, "hasta") || desde,
      todoElDia: bool(formData, "todoElDia"),
      horaInicio: str(formData, "horaInicio") || "00:00",
      horaFin: str(formData, "horaFin") || "23:59",
      reason: optionalStr(formData, "reason") ?? undefined,
      staffId: optionalStr(formData, "staffId") ?? undefined,
    };

    const parsed = esquema.safeParse(datos);
    if (!parsed.success) {
      const primero = parsed.error.issues[0];
      return {
        error: primero.message,
        fieldErrors: { [primero.path.join(".")]: [primero.message] },
      };
    }

    const d = parsed.data;
    const horaInicio = d.todoElDia ? "00:00" : d.horaInicio;
    const horaFin = d.todoElDia ? "23:59" : d.horaFin;

    // "todas" crea un bloqueo por sede, para cierres generales.
    const sedes =
      d.branchId === "todas"
        ? (await prisma.branch.findMany({ where: { active: true }, select: { id: true } })).map(
            (b) => b.id,
          )
        : [d.branchId];

    // Un profesional solo bloquea si se eligió una sede concreta: bloquearlo
    // en "todas" no tiene sentido porque cada quien pertenece a una sola sede.
    const staffId =
      d.branchId !== "todas" && d.staffId
        ? await prisma.teamMember
            .findFirst({ where: { id: d.staffId, branchId: d.branchId }, select: { id: true } })
            .then((m) => m?.id ?? null)
        : null;

    let citasAfectadas = 0;

    for (const branchId of sedes) {
      const startsAt = aUtc(d.desde, horaInicio);
      const endsAt = aUtc(d.hasta, horaFin);

      citasAfectadas += await prisma.appointment.count({
        where: {
          branchId,
          ...(staffId ? { staffId } : {}),
          status: { in: ESTADOS_ACTIVOS },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });

      await prisma.timeOff.create({
        data: { branchId, staffId, startsAt, endsAt, reason: d.reason ?? null },
      });
    }

    revalidatePath("/admin/agenda");
    revalidatePath("/admin/agenda/bloqueos");

    return {
      ok: true,
      message:
        citasAfectadas > 0
          ? `Bloqueo creado. Ojo: hay ${citasAfectadas} cita${citasAfectadas === 1 ? "" : "s"} ya agendada${citasAfectadas === 1 ? "" : "s"} dentro de ese rango. Revísala${citasAfectadas === 1 ? "" : "s"} en la agenda.`
          : "Bloqueo creado. Esas horas ya no se ofrecen.",
    };
  });
}

export async function borrarBloqueo(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.timeOff.delete({ where: { id } });

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
}

/* --- Desde la agenda (vista por profesionales) ----------------------------- */

export type ResultadoBloqueo =
  | { ok: true; citasAfectadas: number }
  | { ok: false; error: string };

/**
 * Bloquea un rango del día directo sobre la agenda: se arrastra sobre la
 * columna de una profesional y se confirma. Sin profesional, bloquea toda la
 * sede. Avisa cuántas citas ya agendadas quedan dentro, pero no las toca.
 */
export async function bloquearEnAgenda(datos: {
  branchId: string;
  staffId?: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  reason?: string;
}): Promise<ResultadoBloqueo> {
  await requireUserForAction(canManageContent);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) return { ok: false, error: "Fecha inválida." };
  if (!/^\d{2}:\d{2}$/.test(datos.horaInicio) || !/^\d{2}:\d{2}$/.test(datos.horaFin)) {
    return { ok: false, error: "Elige la hora de inicio y la de fin." };
  }
  if (datos.horaFin <= datos.horaInicio) {
    return { ok: false, error: "La hora final debe ser posterior a la inicial." };
  }

  const sede = await prisma.branch.findUnique({ where: { id: datos.branchId }, select: { id: true } });
  if (!sede) return { ok: false, error: "Esa sede ya no existe." };

  const staffId = datos.staffId
    ? await prisma.teamMember
        .findFirst({ where: { id: datos.staffId, branchId: sede.id }, select: { id: true } })
        .then((m) => m?.id ?? null)
    : null;
  if (datos.staffId && !staffId) return { ok: false, error: "Esa profesional no es de esta sede." };

  const startsAt = aUtc(datos.fecha, datos.horaInicio);
  const endsAt = aUtc(datos.fecha, datos.horaFin);

  const citasAfectadas = await prisma.appointment.count({
    where: {
      branchId: sede.id,
      ...(staffId ? { staffId } : {}),
      status: { in: ESTADOS_ACTIVOS },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  await prisma.timeOff.create({
    data: {
      branchId: sede.id,
      staffId,
      startsAt,
      endsAt,
      reason: datos.reason?.trim().slice(0, 200) || null,
    },
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
  return { ok: true, citasAfectadas };
}

/** Quita un bloqueo desde la agenda: esas horas vuelven a ofrecerse. */
export async function quitarBloqueo(id: string): Promise<ResultadoBloqueo> {
  await requireUserForAction(canManageContent);
  const r = await prisma.timeOff.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Ese bloqueo ya no existe." };
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
  return { ok: true, citasAfectadas: 0 };
}

/* --- Desbloquear y habilitar horas ----------------------------------------- */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Abre el rango [desde, hasta) quitando lo que lo bloquea: los bloqueos que lo
 * cruzan se recortan y queda solo lo que sobra antes y después.
 *
 * Con `staffId`, se abre solo para esa profesional: sus bloqueos personales se
 * recortan y un bloqueo de toda la sede se reparte en bloqueos personales
 * (completos para las demás, recortado para ella). Sin `staffId`, se recortan
 * los bloqueos de toda la sede. `soloId` limita el cambio a un bloqueo.
 */
async function abrirRango(
  tx: Tx,
  { branchId, staffId, desde, hasta, soloId }: {
    branchId: string;
    staffId: string | null;
    desde: Date;
    hasta: Date;
    soloId?: string;
  },
) {
  const cruza = { startsAt: { lt: hasta }, endsAt: { gt: desde }, ...(soloId ? { id: soloId } : {}) };
  const sobrantes = (b: { startsAt: Date; endsAt: Date }) => [
    ...(b.startsAt < desde ? [{ startsAt: b.startsAt, endsAt: desde }] : []),
    ...(b.endsAt > hasta ? [{ startsAt: hasta, endsAt: b.endsAt }] : []),
  ];

  const [personales, deSede] = await Promise.all([
    staffId ? tx.timeOff.findMany({ where: { ...cruza, staffId } }) : Promise.resolve([]),
    tx.timeOff.findMany({ where: { ...cruza, branchId, staffId: null } }),
  ]);
  const demas = staffId && deSede.length
    ? await tx.teamMember.findMany({
        where: { branchId, active: true, id: { not: staffId } },
        select: { id: true },
      })
    : [];

  for (const b of personales) {
    await tx.timeOff.delete({ where: { id: b.id } });
    for (const r of sobrantes(b)) {
      await tx.timeOff.create({ data: { branchId: b.branchId, staffId: b.staffId, reason: b.reason, ...r } });
    }
  }

  for (const b of deSede) {
    await tx.timeOff.delete({ where: { id: b.id } });
    const base = { branchId: b.branchId, reason: b.reason };
    if (staffId) {
      // Las demás siguen bloqueadas igual que antes.
      for (const d of demas) {
        await tx.timeOff.create({
          data: { ...base, staffId: d.id, startsAt: b.startsAt, endsAt: b.endsAt },
        });
      }
    }
    for (const r of sobrantes(b)) {
      await tx.timeOff.create({ data: { ...base, staffId, ...r } });
    }
  }

  return personales.length + deSede.length;
}

const HORA = /^\d{2}:\d{2}$/;
const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

export type ResultadoHabilitar =
  | { ok: true; desbloqueados: number; fueraDeHorario: boolean }
  | { ok: false; error: string };

/**
 * Deja disponible a una profesional en un rango del día: le quita los
 * bloqueos (los suyos y su parte de los de toda la sede) y, si el rango cae
 * fuera de su horario semanal, lo habilita solo para ese día.
 */
export async function habilitarHoras(datos: {
  branchId: string;
  staffId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  reason?: string;
}): Promise<ResultadoHabilitar> {
  await requireUserForAction(canManageContent);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) return { ok: false, error: "Fecha inválida." };
  if (!HORA.test(datos.horaInicio) || !HORA.test(datos.horaFin)) {
    return { ok: false, error: "Elige la hora de inicio y la de fin." };
  }
  if (datos.horaFin <= datos.horaInicio) {
    return { ok: false, error: "La hora final debe ser posterior a la inicial." };
  }

  const prof = await prisma.teamMember.findFirst({
    where: { id: datos.staffId, branchId: datos.branchId },
    select: { id: true, schedule: true },
  });
  if (!prof) return { ok: false, error: "Esa profesional no es de esta sede." };

  const desde = aUtc(datos.fecha, datos.horaInicio);
  const hasta = aUtc(datos.fecha, datos.horaFin);

  // Dentro de su horario basta con desbloquear; fuera, hay que abrir horas.
  const h = prof.schedule.find((s) => s.weekday === diaSemanaBogota(datos.fecha));
  const fueraDeHorario =
    !h ||
    h.closed ||
    aMin(datos.horaInicio) < aMin(h.opensAt) ||
    aMin(datos.horaFin) > aMin(h.closesAt) + 15;

  const desbloqueados = await prisma.$transaction(async (tx) => {
    const n = await abrirRango(tx, { branchId: datos.branchId, staffId: prof.id, desde, hasta });
    if (fueraDeHorario) {
      await tx.staffExtraHours.create({
        data: {
          branchId: datos.branchId,
          staffId: prof.id,
          startsAt: desde,
          endsAt: hasta,
          reason: datos.reason?.trim().slice(0, 200) || null,
        },
      });
    }
    return n;
  });

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
  return { ok: true, desbloqueados, fueraDeHorario };
}

/** Quita unas horas habilitadas: vuelve a regir el horario semanal. */
export async function quitarHabilitacion(id: string): Promise<ResultadoBloqueo> {
  await requireUserForAction(canManageContent);
  const r = await prisma.staffExtraHours.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Esas horas ya no estaban habilitadas." };
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
  return { ok: true, citasAfectadas: 0 };
}

/**
 * Desbloquea parte de un bloqueo (o todo, sin horas) y, si es de toda la sede,
 * opcionalmente solo para una profesional.
 */
export async function desbloquearParte(datos: {
  id: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  staffId?: string | null;
}): Promise<ResultadoBloqueo> {
  await requireUserForAction(canManageContent);

  const b = await prisma.timeOff.findUnique({ where: { id: datos.id } });
  if (!b) return { ok: false, error: "Ese bloqueo ya no existe." };

  let desde = b.startsAt;
  let hasta = b.endsAt;
  if (datos.fecha && datos.horaInicio && datos.horaFin) {
    if (!HORA.test(datos.horaInicio) || !HORA.test(datos.horaFin) || datos.horaFin <= datos.horaInicio) {
      return { ok: false, error: "La hora final debe ser posterior a la inicial." };
    }
    desde = aUtc(datos.fecha, datos.horaInicio);
    hasta = aUtc(datos.fecha, datos.horaFin);
    if (desde >= b.endsAt || hasta <= b.startsAt) {
      return { ok: false, error: "Esas horas no están dentro del bloqueo." };
    }
  }

  let staffId = b.staffId;
  if (!staffId && datos.staffId) {
    const m = await prisma.teamMember.findFirst({
      where: { id: datos.staffId, branchId: b.branchId },
      select: { id: true },
    });
    if (!m) return { ok: false, error: "Esa profesional no es de esta sede." };
    staffId = m.id;
  }

  await prisma.$transaction((tx) =>
    abrirRango(tx, { branchId: b.branchId, staffId, desde, hasta, soloId: b.id }),
  );

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/bloqueos");
  return { ok: true, citasAfectadas: 0 };
}

/** Quitar horas habilitadas desde la lista de bloqueos. */
export async function borrarHabilitacion(formData: FormData) {
  const id = str(formData, "id");
  if (id) await quitarHabilitacion(id);
}
