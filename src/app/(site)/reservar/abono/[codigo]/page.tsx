import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CurlMark } from "@/components/brand/Logo";
import { fechaBogota, horaBogota } from "@/lib/agenda";
import { prisma } from "@/lib/db";
import { formatCOP, whatsappLink } from "@/lib/format";
import { sincronizarPago, tokenValido } from "@/lib/pagos";
import { getSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu abono",
  robots: { index: false, follow: false },
};

/**
 * A dónde vuelve la clienta después de abonar. Igual que la pantalla del
 * pedido, concilia con Bold si el webhook todavía no llegó.
 */
export default async function EstadoAbonoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { codigo } = await params;
  const { t } = await searchParams;
  if (!tokenValido(codigo, t)) notFound();

  const cargar = () =>
    prisma.appointment.findUnique({
      where: { code: codigo },
      include: {
        branch: true,
        service: { select: { name: true, price: true } },
        payments: { where: { kind: "ABONO" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

  let cita = await cargar();
  if (!cita) notFound();

  const ultimo = cita.payments[0];
  if (ultimo && ultimo.status === "CREADO") {
    await sincronizarPago(ultimo.reference);
    cita = await cargar();
    if (!cita) notFound();
  }

  const estado = cita.depositPaid > 0 ? "APROBADO" : (cita.payments[0]?.status ?? "CREADO");
  const settings = await getSettings();
  const wa = whatsappLink(
    cita.branch.whatsapp || settings.get("contact.whatsapp"),
    `¡Hola Marea Rizada! Escribo por el abono de mi cita ${cita.code}.`,
  );

  // Si abonó el valor completo, la cita quedó paga: no es un "abono".
  const pagoTotal = cita.depositPaid >= (cita.priceOverride ?? cita.service.price);
  const titulo =
    estado === "APROBADO"
      ? pagoTotal
        ? "¡Tu cita quedó paga!"
        : "¡Recibimos tu abono!"
      : estado === "RECHAZADO"
        ? "El abono no se completó"
        : "Tu abono está en proceso";
  const mensaje =
    estado === "APROBADO"
      ? pagoTotal
        ? `Pagaste ${formatCOP(cita.depositPaid)} y tu cita quedó confirmada. El día de la cita no tienes que pagar nada más.`
        : `Abonaste ${formatCOP(cita.depositPaid)} y tu cita quedó confirmada. Se descuenta del valor de tu servicio.`
      : estado === "RECHAZADO"
        ? "El banco no autorizó el cobro. Tu cita sigue en pie: puedes pagar todo en el salón."
        : "Algunos medios de pago se demoran unos minutos. Actualiza esta página en un rato.";

  return (
    <section className="bg-cream">
      <div className="shell py-16 text-center md:py-24">
        <CurlMark className="mx-auto h-14 w-auto text-ink" />
        <p className="t-eyebrow mt-8 text-terra-deep">Cita {cita.code}</p>
        <h1 className="t-editorial mt-4 text-balance text-ink">{titulo}</h1>
        <p className="mx-auto mt-6 max-w-md text-muted">{mensaje}</p>

        <div className="tarjeta mx-auto mt-10 max-w-md border-2 border-stone bg-paper p-8 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Servicio</dt>
              <dd className="text-right text-ink">{cita.service.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Cuándo</dt>
              <dd className="text-right text-ink">
                {fechaBogota(cita.startsAt)} · {horaBogota(cita.startsAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Dónde</dt>
              <dd className="text-right text-ink">
                {cita.branch.city}
                <span className="block text-xs text-muted">{cita.branch.address}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-4">
          {estado !== "APROBADO" && wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Escribirnos por WhatsApp
            </a>
          )}
          <Link href="/" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
