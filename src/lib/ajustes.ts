import "server-only";

import { prisma } from "@/lib/db";

import { AJUSTES_NUEVOS } from "@/lib/ajustes-datos";

export { AJUSTES_NUEVOS, calcularComision } from "@/lib/ajustes-datos";

/** Ajustes que ya no se usan y se quitan del panel. */
// booking.depositAmount: el abono ya no es un valor fijo; la clienta elige
// cuánto abonar (o pagar el total) al terminar de reservar.
const AJUSTES_RETIRADOS = ["payroll.defaultCommissionPercent", "booking.depositAmount", "jobs.formUrl"];

export async function asegurarAjustes() {
  await prisma.setting.createMany({
    data: AJUSTES_NUEVOS.map((a) => ({ ...a })),
    skipDuplicates: true,
  });
  await prisma.setting.deleteMany({ where: { key: { in: AJUSTES_RETIRADOS } } });
}
