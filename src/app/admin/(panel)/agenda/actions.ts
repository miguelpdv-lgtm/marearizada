"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent, METODOS_PAGO } from "@/lib/constants";
import { avisarCambioDeCita, avisarCitaNueva, avisarCitaReagendada } from "@/lib/correo/avisos";
import { str } from "@/lib/actions";
import { aUtc, fechaBogota, generarCodigo, hayConflicto, horaBogota, horasLibres } from "@/lib/agenda";
import { vincularCliente } from "@/lib/clients";
import { generarCodigoVenta } from "@/lib/codigos";
import { avisarVentaMostrador } from "@/lib/correo/avisos";
import { ESTADOS } from "./estado";
import { conPorcentajes } from "@/lib/comisiones";

/** `metodoPago` es opcional a propósito: el equipo puede elegirlo, pero no
 * es obligatorio para guardar el cambio de estado. Solo se toca el campo si
 * llega un valor —así no se borra un método ya guardado por cambiar solo
 * el estado. */
async function guardarEstado(id: string, estado: string, metodoPago?: string) {
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) return;
  if (metodoPago && !METODOS_PAGO.includes(metodoPago as (typeof METODOS_PAGO)[number])) return;

  // "Atendida" solo se pone con "Finalizar cita", que es lo que genera la
  // venta; y una cita ya finalizada solo se mueve con "Reabrir".
  const actual = await prisma.appointment.findUnique({ where: { id }, select: { status: true } });
  if (!actual) return;
  if ((estado === "ATENDIDA") !== (actual.status === "ATENDIDA")) return;

  await prisma.appointment.update({
    where: { id },
    data: {
      status: estado,
      cancelledAt: estado === "CANCELADA" ? new Date() : null,
      ...(metodoPago ? { paymentMethod: metodoPago } : {}),
    },
  });

  // Solo confirmar y cancelar le importan a la clienta; la propia función
  // descarta el resto. Escribirle para decirle que vino al salón no aporta
  // nada, y decirle que no vino sobra.
  avisarCambioDeCita(id, estado);

  revalidatePath("/admin/agenda");
}

/** Para el `<form action={cambiarEstado}>` de la vista de lista. */
export async function cambiarEstado(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  const estado = str(formData, "estado");
  if (!id) return;

  await guardarEstado(id, estado);
}

/** Para llamar directo desde un componente cliente (sin formulario ni botón
 * de guardar): el detalle de cita en la vista por profesionales cambia el
 * estado apenas se elige otro, en el mismo `onChange` del select. */
export async function actualizarEstado(id: string, estado: string, metodoPago?: string) {
  await requireUserForAction(canManageContent);
  await guardarEstado(id, estado, metodoPago);
}

/* --- Reserva completa (crear / editar desde el panel) ----------------------- */

const esquemaReserva = z.object({
  branchId: z.string().min(1, "Elige una sede."),
  serviceId: z.string().min(1, "Elige un servicio."),
  staffId: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha."),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Elige una hora."),
  clientName: z.string().trim().min(2, "Escribe el nombre de la clienta."),
  clientPhone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Escribe un celular válido."),
  clientEmail: z
    .string()
    .trim()
    .email("Escribe un correo válido.")
    .or(z.literal(""))
    .optional(),
  status: z.enum(ESTADOS),
  paymentMethod: z.enum(METODOS_PAGO).optional(),
  price: z.number().int().min(0).optional(),
  notes: z.string().trim().max(600).optional(),
  internalNotes: z.string().trim().max(600).optional(),
  /** true = ya se avisó de un choque de horario y se guarda igual. */
  confirmar: z.boolean().optional(),
});

export type DatosReservaAdmin = z.infer<typeof esquemaReserva>;

export type ResultadoReservaAdmin =
  | { ok: true; message: string }
  | { ok: false; error: string; campo?: string }
  | { warning: true; message: string };

/** Profesionales activos de una sede que hacen un servicio — para el selector del formulario. */
export async function staffParaServicio(branchId: string, serviceId: string) {
  // Lo que devuelve ya está publicado en el sitio, así que no hay secreto que
  // guardar. La guarda va igual: una server action es un endpoint público, y
  // que todas las del panel exijan sesión es más fácil de sostener que
  // recordar cuáles son la excepción.
  await requireUserForAction(canManageContent);
  if (!branchId || !serviceId) return [];
  return prisma.teamMember.findMany({
    where: { branchId, active: true, services: { some: { serviceId } } },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });
}

async function guardarReserva(
  datos: DatosReservaAdmin,
  citaId?: string,
): Promise<ResultadoReservaAdmin> {
  await requireUserForAction(canManageContent);

  const parsed = esquemaReserva.safeParse(datos);
  if (!parsed.success) {
    const primero = parsed.error.issues[0];
    return { ok: false, error: primero.message, campo: primero.path.join(".") };
  }
  const d = parsed.data;

  const [servicio, sede] = await Promise.all([
    prisma.service.findUnique({ where: { id: d.serviceId } }),
    prisma.branch.findUnique({ where: { id: d.branchId } }),
  ]);
  if (!servicio) return { ok: false, error: "Ese servicio ya no existe." };
  if (!sede) return { ok: false, error: "Esa sede ya no existe." };

  if (citaId) {
    const actual = await prisma.appointment.findUnique({ where: { id: citaId }, select: { status: true } });
    if (actual && (d.status === "ATENDIDA") !== (actual.status === "ATENDIDA")) {
      return {
        ok: false,
        error:
          actual.status === "ATENDIDA"
            ? "La cita está finalizada. Usa \"Reabrir para corregir\" antes de cambiarle el estado."
            : "Para marcarla atendida usa \"Finalizar cita\": así queda registrada la venta.",
      };
    }
  } else if (d.status === "ATENDIDA") {
    return { ok: false, error: "Una reserva nueva no puede crearse ya atendida." };
  }

  const staffId = d.staffId || null;
  const inicio = aUtc(d.fecha, d.hora);
  // Los servicios sumados desde la ficha alargan la cita; al editarla no se
  // pueden perder esos minutos.
  const extra = citaId
    ? (
        await prisma.appointmentItem.aggregate({
          where: { appointmentId: citaId, kind: "SERVICE" },
          _sum: { durationMin: true },
        })
      )._sum.durationMin ?? 0
    : 0;
  const fin = new Date(inicio.getTime() + (servicio.durationMin + extra) * 60_000);

  // AgendaPro avisa del choque pero no lo bloquea — igual acá: solo se
  // detiene la primera vez, para que el panel pueda mostrar el aviso y
  // reintentar con `confirmar: true` si de verdad se quiere guardar así.
  if (!d.confirmar) {
    const conflicto = await hayConflicto(d.branchId, staffId, inicio, fin, citaId);
    if (conflicto) {
      return {
        warning: true,
        message: staffId
          ? "Este profesional ya tiene una reserva o un bloqueo en ese horario."
          : "Hay un bloqueo de sede en ese horario.",
      };
    }
  }

  const priceOverride = d.price != null && d.price !== servicio.price ? d.price : null;

  const clientId = await vincularCliente({
    name: d.clientName,
    phone: d.clientPhone,
    email: d.clientEmail,
  });

  const data = {
    branchId: d.branchId,
    serviceId: d.serviceId,
    staffId,
    startsAt: inicio,
    endsAt: fin,
    status: d.status,
    // undefined si no se tocó el campo: en la edición no borra un método ya
    // guardado antes por cambiar otra cosa del formulario.
    paymentMethod: d.paymentMethod,
    clientName: d.clientName,
    clientPhone: d.clientPhone,
    clientEmail: d.clientEmail || null,
    clientId,
    notes: d.notes || null,
    internalNotes: d.internalNotes || null,
    priceOverride,
  };

  if (citaId) {
    const antes = await prisma.appointment.findUnique({
      where: { id: citaId },
      select: { startsAt: true, status: true },
    });
    await prisma.appointment.update({
      where: { id: citaId },
      data: {
        ...data,
        cancelledAt: d.status === "CANCELADA" ? new Date() : null,
        // Con fecha nueva, el recordatorio vuelve a salir para esa fecha.
        ...(antes && antes.startsAt.getTime() !== inicio.getTime() ? { reminderSentAt: null } : {}),
      },
    });
    // Si cambió la fecha u hora de una cita que sigue en pie, eso es lo que
    // la clienta necesita saber; si no, se entera de la confirmación o la
    // cancelación como siempre.
    if (antes && antes.startsAt.getTime() !== inicio.getTime() && d.status !== "CANCELADA") {
      avisarCitaReagendada(citaId);
    } else if (antes?.status !== d.status) {
      avisarCambioDeCita(citaId, d.status);
    }
    revalidatePath("/admin/agenda");
    return { ok: true, message: "Reserva actualizada." };
  }

  // Reintenta si el código corto choca con uno existente.
  for (let intento = 0; intento < 5; intento++) {
    try {
      const cita = await prisma.appointment.create({
        data: { ...data, code: generarCodigo(), source: "ADMIN" },
        select: { id: true },
      });
      // Mismo correo que recibe quien reserva por el sitio. Una cita tomada
      // por teléfono no tiene por qué valer menos que una tomada en la web.
      avisarCitaNueva(cita.id);
      revalidatePath("/admin/agenda");
      return { ok: true, message: "Reserva creada." };
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "P2002" && intento < 4) continue;
      return { ok: false, error: "No pudimos guardar la reserva. Inténtalo de nuevo." };
    }
  }

  return { ok: false, error: "No pudimos generar el código de la reserva." };
}

export async function crearReservaAdmin(datos: DatosReservaAdmin) {
  return guardarReserva(datos);
}

export async function actualizarReserva(id: string, datos: DatosReservaAdmin) {
  return guardarReserva(datos, id);
}

/* --- Reagendar -------------------------------------------------------------- */

/** Horas libres para mover una cita a `fecha`, sin contarla a ella misma y
 * con su duración real. */
export async function horasParaReagendar(citaId: string, fecha: string) {
  await requireUserForAction(canManageContent);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  const cita = await prisma.appointment.findUnique({
    where: { id: citaId },
    select: { branchId: true, serviceId: true, startsAt: true, endsAt: true },
  });
  if (!cita) return [];
  const duracion = Math.round((cita.endsAt.getTime() - cita.startsAt.getTime()) / 60_000);
  return horasLibres(cita.branchId, cita.serviceId, fecha, {
    excluirCitaId: citaId,
    duracion,
    sinAnticipacion: true,
  });
}

export type ResultadoReagendar =
  | {
      ok: true;
      message: string;
      fecha: string;
      hora: string;
      /** Lo que quedó guardado, leído de vuelta de la base para mostrarlo. */
      horaFin?: string;
      profesional?: string | null;
      avisada?: boolean;
    }
  | { ok: false; error: string }
  | { warning: true; message: string };

/**
 * Mueve una cita a otra fecha u hora conservando su duración (servicio más
 * lo que se le haya sumado), su profesional si sigue libre y todo lo demás.
 * Igual que al editar: un choque se avisa y se puede guardar igual.
 */
export async function reagendarCita(
  citaId: string,
  fecha: string,
  hora: string,
  confirmar = false,
  /** Al arrastrar en la agenda: otra profesional y si se le avisa a la clienta. */
  opciones: { staffId?: string; avisar?: boolean } = {},
): Promise<ResultadoReagendar> {
  await requireUserForAction(canManageContent);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Elige una fecha." };
  if (!/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: "Elige una hora." };

  const cita = await prisma.appointment.findUnique({
    where: { id: citaId },
    select: {
      branchId: true,
      staffId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      sale: { select: { id: true } },
    },
  });
  if (!cita) return { ok: false, error: "Esa reserva ya no existe." };
  if (cita.status === "CANCELADA") {
    return { ok: false, error: "La reserva está cancelada. Cámbiale el estado antes de moverla." };
  }
  if (cita.sale) return { ok: false, error: "Esa cita ya se finalizó y facturó; no se puede mover." };

  let staffId = cita.staffId;
  if (opciones.staffId && opciones.staffId !== cita.staffId) {
    const m = await prisma.teamMember.findFirst({
      where: { id: opciones.staffId, branchId: cita.branchId, active: true },
      select: { id: true },
    });
    if (!m) return { ok: false, error: "Esa profesional no es de esta sede." };
    staffId = m.id;
  }

  const duracion = cita.endsAt.getTime() - cita.startsAt.getTime();
  const inicio = aUtc(fecha, hora);
  const fin = new Date(inicio.getTime() + duracion);
  if (inicio.getTime() === cita.startsAt.getTime() && staffId === cita.staffId) {
    return { ok: false, error: "Esa ya es la fecha y hora de la reserva." };
  }

  if (!confirmar && (await hayConflicto(cita.branchId, staffId, inicio, fin, citaId))) {
    return {
      warning: true,
      message: staffId
        ? "La profesional ya tiene una reserva o un bloqueo a esa hora."
        : "Hay un bloqueo de sede a esa hora.",
    };
  }

  const guardada = await prisma.appointment.update({
    where: { id: citaId },
    data: {
      startsAt: inicio,
      endsAt: fin,
      staffId,
      ...(inicio.getTime() !== cita.startsAt.getTime() ? { reminderSentAt: null } : {}),
    },
    select: { startsAt: true, endsAt: true, staff: { select: { name: true } } },
  });
  // Cambiar solo de profesional no le cambia nada a la clienta.
  const avisar = (opciones.avisar ?? true) && inicio.getTime() !== cita.startsAt.getTime();
  if (avisar) avisarCitaReagendada(citaId);
  revalidatePath("/admin/agenda");

  return {
    ok: true,
    message: avisar ? "Reserva reagendada. Le avisamos a la clienta por correo." : "Reserva movida.",
    fecha: fechaBogota(guardada.startsAt),
    hora: horaBogota(guardada.startsAt),
    horaFin: horaBogota(guardada.endsAt),
    profesional: guardada.staff?.name ?? null,
    avisada: avisar,
  };
}

/* --- Finalizar la cita ----------------------------------------------------- */

export type ResultadoFinalizar = { ok: true; saleId?: string } | { ok: false; error: string };

/**
 * "Hasta aquí llegó": cierra la visita y la convierte en una venta.
 *
 * Mientras la cita está abierta, todo lo que se le suma (servicios,
 * productos) vive dentro de ella, en la agenda, sin importar la hora. Al
 * finalizar:
 *   1. Se crea UNA venta con el servicio principal (a su precio final) y todo
 *      lo que se le agregó, cada línea con quien la vendió. El inventario no
 *      se toca: los productos ya se descontaron al agregarlos a la cita.
 *   2. Se registra el pago: el abono en línea como EN_LINEA y el resto con el
 *      medio que se elija.
 *   3. La cita queda atendida y ya no se le puede sumar nada.
 */
export async function finalizarCita(
  id: string,
  datos: { precioServicio: number; metodoPago?: string },
): Promise<ResultadoFinalizar> {
  const user = await requireUserForAction(canManageContent);

  if (!Number.isInteger(datos.precioServicio) || datos.precioServicio < 0) {
    return { ok: false, error: "Escribe un precio válido para el servicio." };
  }
  if (datos.metodoPago && !METODOS_PAGO.includes(datos.metodoPago as (typeof METODOS_PAGO)[number])) {
    return { ok: false, error: "Ese medio de pago no existe." };
  }

  const cita = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, name: true, price: true } },
      items: { orderBy: { createdAt: "asc" } },
      client: { select: { document: true, documentType: true } },
      sale: { select: { id: true } },
    },
  });
  if (!cita) return { ok: false, error: "Esa reserva ya no existe." };
  if (cita.status === "CANCELADA") {
    return { ok: false, error: "La reserva está cancelada; no se puede finalizar." };
  }
  if (cita.sale) return { ok: false, error: "Esta cita ya se finalizó y tiene su venta." };

  const lineas = [
    {
      kind: "SERVICE",
      serviceId: cita.service.id,
      name: cita.service.name,
      quantity: 1,
      unitPrice: datos.precioServicio,
      discount: 0,
      staffId: cita.staffId,
    },
    ...cita.items.map((i) => ({
      kind: i.kind,
      serviceId: i.serviceId,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: 0,
      staffId: i.staffId ?? cita.staffId,
    })),
  ];
  const total = lineas.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  // Cada servicio guarda el % de comisión vigente hoy.
  const lineasConComision = await conPorcentajes(lineas);

  // El abono ya entró en línea; lo que falta, con el medio que se eligió.
  const abono = Math.min(cita.depositPaid, total);
  const pagos = [
    ...(abono > 0 ? [{ method: "EN_LINEA", amount: abono }] : []),
    ...(total - abono > 0 && datos.metodoPago ? [{ method: datos.metodoPago, amount: total - abono }] : []),
  ];
  const medioPrincipal = [...pagos].sort((a, b) => b.amount - a.amount)[0]?.method ?? null;

  // Si la clienta tiene documento en su ficha, queda en la venta.
  const conDocumento = Boolean(cita.client?.document && cita.client?.documentType);

  let venta: { id: string } | null = null;
  for (let intento = 0; intento < 5 && !venta; intento++) {
    try {
      venta = await prisma.$transaction(async (tx) => {
        const v = await tx.sale.create({
          data: {
            code: generarCodigoVenta(),
            branchId: cita.branchId,
            appointmentId: cita.id,
            clientName: cita.clientName,
            clientPhone: cita.clientPhone,
            clientId: cita.clientId,
            clientDocType: conDocumento ? cita.client!.documentType : null,
            clientDocument: conDocumento ? cita.client!.document : null,
            staffId: cita.staffId,
            soldById: user.id,
            paymentMethod: medioPrincipal,
            notes: `Cita ${cita.code}`,
            items: { create: lineasConComision },
            payments: { create: pagos },
          },
          select: { id: true },
        });
        await tx.appointment.update({
          where: { id: cita.id },
          data: {
            status: "ATENDIDA",
            cancelledAt: null,
            priceOverride: datos.precioServicio !== cita.service.price ? datos.precioServicio : null,
            ...(datos.metodoPago ? { paymentMethod: datos.metodoPago } : {}),
          },
        });
        return v;
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "P2002" && intento < 4) continue;
      return { ok: false, error: "No pudimos cerrar la cita. Inténtalo de nuevo." };
    }
  }
  if (!venta) return { ok: false, error: "No pudimos generar el código de la venta." };

  avisarVentaMostrador(venta.id);

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/ventas");
  return { ok: true, saleId: venta.id };
}

/**
 * Deshace "Finalizar" para corregir algo: borra la venta que se generó y la
 * cita vuelve a confirmada, con todo lo que tenía.
 */
export async function reabrirCita(id: string): Promise<ResultadoFinalizar> {
  await requireUserForAction(canManageContent);

  const cita = await prisma.appointment.findUnique({
    where: { id },
    select: { status: true, sale: { select: { id: true } } },
  });
  if (!cita || cita.status !== "ATENDIDA") return { ok: false, error: "La cita no estaba finalizada." };

  await prisma.$transaction([
    // Sin mover inventario: los productos siguen dentro de la cita.
    ...(cita.sale ? [prisma.sale.delete({ where: { id: cita.sale.id } })] : []),
    prisma.appointment.update({ where: { id }, data: { status: "CONFIRMADA" } }),
  ]);
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/ventas");
  return { ok: true };
}
