"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUserForAction } from "@/lib/auth";
import { canManageContent } from "@/lib/constants";
import {
  bool,
  int,
  optionalStr,
  runAction,
  str,
  zodToState,
  type ActionState,
} from "@/lib/actions";

const schema = z.object({
  name: z.string().min(2, "El nombre es obligatorio."),
  role: z.string().min(2, "El cargo es obligatorio."),
  specialty: z.string().min(2, "La especialidad es obligatoria."),
});

function readForm(formData: FormData) {
  return {
    name: str(formData, "name"),
    role: str(formData, "role"),
    specialty: str(formData, "specialty"),
    bio: optionalStr(formData, "bio"),
    imageUrl: optionalStr(formData, "imageUrl"),
    instagram: optionalStr(formData, "instagram"),
    branchId: optionalStr(formData, "branchId"),
    order: int(formData, "order"),
    active: bool(formData, "active"),
  };
}

/** Las 7 filas de horario semanal, tal como las manda TeamForm. */
function readSchedule(formData: FormData) {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    opensAt: str(formData, `weekday-${weekday}-opensAt`) || "09:00",
    closesAt: str(formData, `weekday-${weekday}-closesAt`) || "18:00",
    closed: bool(formData, `weekday-${weekday}-closed`),
  }));
}

/** Guarda horario y servicios de un profesional ya creado. */
async function guardarHorarioYServicios(staffId: string, formData: FormData) {
  const horario = readSchedule(formData);
  await Promise.all(
    horario.map((h) =>
      prisma.staffSchedule.upsert({
        where: { staffId_weekday: { staffId, weekday: h.weekday } },
        update: { opensAt: h.opensAt, closesAt: h.closesAt, closed: h.closed },
        create: { staffId, ...h },
      }),
    ),
  );

  const serviceIds = formData.getAll("serviceIds").filter((v): v is string => typeof v === "string");
  await prisma.staffService.deleteMany({ where: { staffId } });
  if (serviceIds.length > 0) {
    await prisma.staffService.createMany({
      data: serviceIds.map((serviceId) => ({ staffId, serviceId })),
      skipDuplicates: true,
    });
  }
}

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/admin/equipo");
  revalidatePath("/admin/agenda");
}

export async function createTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    const creado = await prisma.teamMember.create({ data });
    await guardarHorarioYServicios(creado.id, formData);
    revalidateSite();
    redirect("/admin/equipo?ok=creado");
  });
}

export async function updateTeamMember(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    await prisma.teamMember.update({ where: { id }, data });
    await guardarHorarioYServicios(id, formData);
    revalidateSite();
    return { ok: true, message: "Integrante actualizado." };
  });
}

export async function deleteTeamMember(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.teamMember.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/equipo?ok=eliminado");
}
