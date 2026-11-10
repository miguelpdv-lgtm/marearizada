"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import { hayConflicto } from "@/lib/agenda";
import { moverStock } from "@/lib/stock";
import type { AppointmentItem } from "@prisma/client";

/**
 * Vender dentro de una cita: sumarle servicios adicionales (ocupan tiempo
 * real — se revisa disponibilidad y se extiende `endsAt`) y productos
 * (descuentan stock). Ver plan "agile-seeking-kite" para el diseño completo.
 */

export type ItemDTO = {
  id: string;
  kind: "SERVICE" | "PRODUCT";
  name: string;
  quantity: number;
  unitPrice: number;
  durationMin: number | null;
  /** Quién lo vendió (para su comisión). */
  staffId: string | null;
  staffName: string | null;
};

export type ItemResultado =
  | { ok: true; items: ItemDTO[]; endsAt: string }
  | { ok: false; error: string }
  | { warning: true; message: string };

function aDTO(item: AppointmentItem & { staff?: { name: string } | null }): ItemDTO {
  return {
    id: item.id,
    kind: item.kind as "SERVICE" | "PRODUCT",
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    durationMin: item.durationMin,
    staffId: item.staffId,
    staffName: item.staff?.name ?? null,
  };
}

/** Solo se acepta una profesional que exista y esté activa. */
async function profesionalValida(staffId: string | undefined) {
  if (!staffId) return null;
  const p = await prisma.teamMember.findFirst({ where: { id: staffId, active: true }, select: { id: true } });
  return p?.id ?? null;
}

/** Una cita finalizada (atendida) ya se cobró: no se le suma ni se le quita
 * nada sin reabrirla primero. */
const FINALIZADA = "La cita ya está finalizada. Reábrela para cambiar lo que se vendió.";

async function estadoActual(appointmentId: string): Promise<{ items: ItemDTO[]; endsAt: string }> {
  const [items, cita] = await Promise.all([
    prisma.appointmentItem.findMany({
      where: { appointmentId },
      orderBy: { createdAt: "asc" },
      include: { staff: { select: { name: true } } },
    }),
    prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { endsAt: true } }),
  ]);
  return { items: items.map(aDTO), endsAt: cita.endsAt.toISOString() };
}

export async function agregarServicioACita(
  appointmentId: string,
  serviceId: string,
  confirmar = false,
  staffId?: string,
): Promise<ItemResultado> {
  await requireUserForAction(canManageContent);

  const [cita, servicio] = await Promise.all([
    prisma.appointment.findUnique({ where: { id: appointmentId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!cita) return { ok: false, error: "Esa cita ya no existe." };
  if (!servicio) return { ok: false, error: "Ese servicio ya no existe." };
  if (cita.status === "ATENDIDA") return { ok: false, error: FINALIZADA };

  const nuevoFin = new Date(cita.endsAt.getTime() + servicio.durationMin * 60_000);

  if (!confirmar) {
    const conflicto = await hayConflicto(cita.branchId, cita.staffId, cita.endsAt, nuevoFin, cita.id);
    if (conflicto) {
      return {
        warning: true,
        message: cita.staffId
          ? "El profesional ya tiene algo agendado justo después de esta cita."
          : "Hay un bloqueo de todo el local justo después de esta cita.",
      };
    }
  }

  await prisma.$transaction([
    prisma.appointment.update({ where: { id: appointmentId }, data: { endsAt: nuevoFin } }),
    prisma.appointmentItem.create({
      data: {
        appointmentId,
        kind: "SERVICE",
        serviceId: servicio.id,
        name: servicio.name,
        unitPrice: servicio.price,
        durationMin: servicio.durationMin,
        staffId: (await profesionalValida(staffId)) ?? cita.staffId,
      },
    }),
  ]);

  revalidatePath("/admin/agenda");
  return { ok: true, ...(await estadoActual(appointmentId)) };
}

export async function agregarProductoACita(
  appointmentId: string,
  productId: string,
  quantity: number,
  staffId?: string,
): Promise<ItemResultado> {
  const user = await requireUserForAction(canManageContent);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "La cantidad debe ser al menos 1." };
  }

  const [cita, producto] = await Promise.all([
    prisma.appointment.findUnique({ where: { id: appointmentId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!cita) return { ok: false, error: "Esa cita ya no existe." };
  if (!producto) return { ok: false, error: "Ese producto ya no existe." };
  if (cita.status === "ATENDIDA") return { ok: false, error: FINALIZADA };

  const stockSede = await prisma.productStock.findUnique({
    where: { productId_branchId: { productId, branchId: cita.branchId } },
  });
  const disponible = stockSede?.stock ?? 0;
  if (quantity > disponible) {
    return { ok: false, error: `Solo quedan ${disponible} unidades de ese producto en este local.` };
  }

  await prisma.appointmentItem.create({
    data: {
      appointmentId,
      kind: "PRODUCT",
      productId,
      name: producto.name,
      quantity,
      unitPrice: producto.price,
      staffId: (await profesionalValida(staffId)) ?? cita.staffId,
    },
  });
  await moverStock({
    productId,
    branchId: cita.branchId,
    delta: -quantity,
    cause: "Venta",
    comment: `Cita ${cita.code}`,
    staffId: user.id,
  });

  revalidatePath("/admin/agenda");
  revalidatePath(`/admin/productos/${productId}`);
  return { ok: true, ...(await estadoActual(appointmentId)) };
}

export async function quitarItemCita(appointmentId: string, itemId: string): Promise<ItemResultado> {
  const user = await requireUserForAction(canManageContent);

  const item = await prisma.appointmentItem.findUnique({ where: { id: itemId } });
  if (!item || item.appointmentId !== appointmentId) {
    return { ok: false, error: "Ese ítem ya no existe." };
  }

  const cita = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!cita) return { ok: false, error: "Esa cita ya no existe." };
  if (cita.status === "ATENDIDA") return { ok: false, error: FINALIZADA };

  if (item.kind === "PRODUCT" && item.productId) {
    await moverStock({
      productId: item.productId,
      branchId: cita.branchId,
      delta: item.quantity,
      cause: "Ajuste manual",
      comment: `Se quitó de la cita ${cita.code}`,
      staffId: user.id,
    });
  }

  await prisma.appointmentItem.delete({ where: { id: itemId } });

  if (item.kind === "SERVICE") {
    // Se recalcula desde cero para que no importe el orden en que se quiten
    // varios servicios adicionales.
    const [servicioBase, restantes] = await Promise.all([
      prisma.service.findUnique({ where: { id: cita.serviceId }, select: { durationMin: true } }),
      prisma.appointmentItem.findMany({
        where: { appointmentId, kind: "SERVICE" },
        select: { durationMin: true },
      }),
    ]);
    const extra = restantes.reduce((a, i) => a + (i.durationMin ?? 0), 0);
    const nuevoFin = new Date(
      cita.startsAt.getTime() + ((servicioBase?.durationMin ?? 0) + extra) * 60_000,
    );
    await prisma.appointment.update({ where: { id: appointmentId }, data: { endsAt: nuevoFin } });
  }

  revalidatePath("/admin/agenda");
  if (item.productId) revalidatePath(`/admin/productos/${item.productId}`);
  return { ok: true, ...(await estadoActual(appointmentId)) };
}

/**
 * Cambia el precio de un servicio adicional ya sumado a la cita. Es para los
 * servicios de precio variable ("desde $35.000", según el largo del cabello):
 * el valor real se sabe en el salón. Los productos no: su precio es el del
 * catálogo, y una rebaja va como descuento en la venta.
 */
export async function cambiarPrecioItemCita(
  appointmentId: string,
  itemId: string,
  unitPrice: number,
): Promise<ItemResultado> {
  await requireUserForAction(canManageContent);
  if (!Number.isInteger(unitPrice) || unitPrice < 0) {
    return { ok: false, error: "Escribe un precio válido." };
  }

  const [item, cita] = await Promise.all([
    prisma.appointmentItem.findUnique({ where: { id: itemId } }),
    prisma.appointment.findUnique({ where: { id: appointmentId }, select: { status: true } }),
  ]);
  if (!item || item.appointmentId !== appointmentId || !cita) {
    return { ok: false, error: "Ese ítem ya no existe." };
  }
  if (item.kind !== "SERVICE") return { ok: false, error: "Solo se cambia el precio de los servicios." };
  if (cita.status === "ATENDIDA") return { ok: false, error: FINALIZADA };

  await prisma.appointmentItem.update({ where: { id: itemId }, data: { unitPrice } });
  revalidatePath("/admin/agenda");
  return { ok: true, ...(await estadoActual(appointmentId)) };
}
