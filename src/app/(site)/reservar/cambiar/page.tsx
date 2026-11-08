import type { Metadata } from "next";
import Link from "next/link";

import { configAgenda, fechaBogota, horaBogota, hoyBogota } from "@/lib/agenda";
import { whatsappLink } from "@/lib/format";
import { getSettings } from "@/lib/site";
import { prisma } from "@/lib/db";
import { etiquetaFecha, hora12 } from "../fechas";
import { BuscarCita, CambiarCita } from "./CambiarCita";
import { cargarCita, motivoNoCambiable } from "./cita";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cambiar mi cita",
  robots: { index: false, follow: false },
};

/**
 * La clienta mueve su cita sola. Sin enlace, pide el código y el celular;
 * con el enlace firmado (del correo o de la búsqueda) muestra la cita y deja
 * elegir otro día y hora libres.
 */
export default async function CambiarCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; t?: string }>;
}) {
  const { codigo, t } = await searchParams;
  const cita = codigo && t ? await cargarCita(codigo, t) : null;
  const settings = await getSettings();

  return (
    <section className="bg-cream">
      <div className="shell py-16 md:py-24">
        <div className="text-center">
          <p className="t-eyebrow text-terra-deep">{cita ? `Cita ${cita.code}` : "Tu cita"}</p>
          <h1 className="t-editorial mt-4 text-balance text-ink">Cambiar mi cita</h1>
        </div>

        {!cita ? (
          <div className="mx-auto mt-10 max-w-md">
            {codigo && t && (
              <p className="mb-5 border border-terra/40 bg-paper px-4 py-3 text-sm text-terra">
                Ese enlace ya no es válido. Busca tu cita con el código y tu celular.
              </p>
            )}
            <p className="mb-6 text-center text-muted">
              Escribe el código que te llegó al reservar (por ejemplo <strong>MR-7K3P</strong>) y el
              celular con el que reservaste.
            </p>
            <BuscarCita codigoInicial={codigo ?? ""} />
          </div>
        ) : (
          <Detalle cita={cita} token={t!} whatsappGeneral={settings.get("contact.whatsapp")} />
        )}

        <p className="mt-12 text-center text-sm text-muted">
          <Link href="/reservar" className="underline underline-offset-4 hover:text-terra">
            Reservar una cita nueva
          </Link>
        </p>
      </div>
    </section>
  );
}

async function Detalle({
  cita,
  token,
  whatsappGeneral,
}: {
  cita: NonNullable<Awaited<ReturnType<typeof cargarCita>>>;
  token: string;
  whatsappGeneral: string;
}) {
  const [cfg, horario] = await Promise.all([
    configAgenda(),
    prisma.businessHour.findMany({ where: { branchId: cita.branchId, closed: false } }),
  ]);
  const motivo = cita.branch.closedNotice ?? motivoNoCambiable(cita, cfg.minHorasAntes);
  const wa = whatsappLink(
    cita.branch.whatsapp || whatsappGeneral,
    `¡Hola Marea Rizada! Quiero cambiar mi cita ${cita.code}.`,
  );
  const fecha = fechaBogota(cita.startsAt);

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="tarjeta mx-auto max-w-md border-2 border-stone bg-paper p-6">
        <p className="t-small mb-3 text-clay">Tu cita ahora</p>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Servicio</dt>
            <dd className="text-right text-ink">{cita.service.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Cuándo</dt>
            <dd className="text-right font-semibold text-ink">
              {etiquetaFecha(fecha)} · {hora12(horaBogota(cita.startsAt))}
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

      {motivo ? (
        <div className="mx-auto mt-8 max-w-md text-center">
          <p className="border border-gold-500 bg-gold-100 px-4 py-3 text-sm text-ink">{motivo}</p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
              Escribirnos por WhatsApp
            </a>
          )}
        </div>
      ) : (
        <CambiarCita
          codigo={cita.code}
          token={token}
          hoy={hoyBogota()}
          maxDias={cfg.maxDiasAdelante}
          ultimaCita={Object.fromEntries(horario.map((h) => [h.weekday, h.closesAt]))}
        />
      )}
    </div>
  );
}
