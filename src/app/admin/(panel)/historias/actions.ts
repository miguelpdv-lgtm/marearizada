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
  clientName: z.string().min(2, "El nombre de la clienta es obligatorio."),
  quote: z.string().min(10, "La cita debe tener al menos 10 caracteres."),
  rating: z.number().int().min(1).max(5),
});

function readForm(formData: FormData) {
  return {
    clientName: str(formData, "clientName"),
    city: optionalStr(formData, "city"),
    quote: str(formData, "quote"),
    story: optionalStr(formData, "story"),
    rating: int(formData, "rating", 5),
    serviceName: optionalStr(formData, "serviceName"),
    avatarUrl: optionalStr(formData, "avatarUrl"),
    videoUrl: optionalStr(formData, "videoUrl"),
    beforeImageUrl: optionalStr(formData, "beforeImageUrl"),
    afterImageUrl: optionalStr(formData, "afterImageUrl"),
    featured: bool(formData, "featured"),
    order: int(formData, "order"),
    active: bool(formData, "active"),
  };
}

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/admin/historias");
}

export async function createTestimonial(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    await prisma.testimonial.create({ data });
    revalidateSite();
    redirect("/admin/historias?ok=creado");
  });
}

export async function updateTestimonial(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireUserForAction(canManageContent);

    const data = readForm(formData);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return zodToState(parsed.error);

    await prisma.testimonial.update({ where: { id }, data });
    revalidateSite();
    return { ok: true, message: "Historia actualizada." };
  });
}

export async function deleteTestimonial(formData: FormData) {
  await requireUserForAction(canManageContent);

  const id = str(formData, "id");
  if (!id) return;

  await prisma.testimonial.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/historias?ok=eliminado");
}
