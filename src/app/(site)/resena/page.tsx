import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { tokenValido } from "@/lib/pagos";
import { cuando } from "@/lib/correo/avisos";
import { FormResena } from "./FormResena";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deja tu reseña",
  robots: { index: false, follow: false },
};

/** Llega desde el correo de "gracias por venir": el enlace trae código y token. */
export default async function ResenaPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; t?: string }>;
}) {
  const { c: codigo = "", t: token = "" } = await searchParams;
  const valido = Boolean(codigo) && tokenValido(`resena:${codigo}`, token);
  const cita = valido
    ? await prisma.appointment.findUnique({
        where: { code: codigo },
        select: {
          status: true,
          clientName: true,
          startsAt: true,
          service: { select: { name: true } },
          review: { select: { id: true } },
        },
      })
    : null;

  return (
    <section className="rf">
      <div className="rf-wrap">
        {!cita ? (
          <Aviso titulo="Este enlace no es válido">
            Abre el enlace completo desde el correo que te enviamos. Si el problema sigue, escríbenos.
          </Aviso>
        ) : cita.review ? (
          <Aviso titulo="Ya recibimos tu reseña">¡Gracias! La revisamos y la publicamos pronto.</Aviso>
        ) : cita.status !== "ATENDIDA" ? (
          <Aviso titulo="Aún no es momento">Podrás dejar tu reseña después de tu cita.</Aviso>
        ) : (
          <div className="rf-screen">
            <p className="rf-eyebrow">Tu reseña</p>
            <h1 style={{ marginTop: 10 }}>¿Cómo te fue en Marea Rizada?</h1>
            <p className="rf-lead" style={{ marginTop: 10, marginBottom: 24 }}>
              {cita.service?.name} · {cuando(cita.startsAt)}
            </p>
            <FormResena codigo={codigo} token={token} nombre={cita.clientName.trim().split(/\s+/)[0] ?? ""} />
          </div>
        )}
      </div>
    </section>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rf-card rf-card--plana mx-auto text-center" style={{ marginTop: 32 }}>
      <h2>{titulo}</h2>
      <p>{children}</p>
      <p style={{ marginTop: 16 }}>
        <Link href="/reservar" className="rf-btn">
          Reservar una cita
        </Link>
      </p>
    </div>
  );
}
