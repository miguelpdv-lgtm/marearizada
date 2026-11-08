import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { sincronizarPago, tokenValido } from "@/lib/pagos";
import { resumenCita } from "../../resumen";
import { PagoRetorno } from "./PagoRetorno";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu pago",
  robots: { index: false, follow: false },
};

/**
 * A dónde vuelve la clienta desde la pasarela (y el enlace para retomar un
 * pago pendiente). Si el webhook todavía no llegó, concilia el último cobro
 * con la pasarela antes de mostrar nada.
 */
export default async function PagoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { codigo } = await params;
  const { t = "" } = await searchParams;
  if (!tokenValido(codigo, t)) notFound();

  const ultimo = await prisma.payment.findFirst({
    where: { appointment: { code: codigo }, kind: "ABONO" },
    orderBy: { createdAt: "desc" },
    select: { reference: true, status: true },
  });
  if (ultimo?.status === "CREADO") await sincronizarPago(ultimo.reference);

  const r = await resumenCita(codigo);
  if (!r) notFound();

  return (
    <PagoRetorno
      codigo={codigo}
      token={t}
      resumen={r.resumen}
      pago={r.pago}
      vencida={r.vencida || (r.resumen.estado === "CANCELADA" && r.holdUntil != null)}
      rechazado={ultimo?.status === "RECHAZADO"}
    />
  );
}
