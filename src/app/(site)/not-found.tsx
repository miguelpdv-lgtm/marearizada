import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esta página no existe",
  // Una 404 indexada no le sirve a nadie.
  robots: { index: false, follow: true },
};

/**
 * 404 del sitio público. Hereda el encabezado y el pie del layout de `(site)`,
 * así que la clienta nunca queda sin salida: el menú sigue ahí arriba.
 */
export default function NoEncontrada() {
  return (
    <section className="bg-canvas py-24 md:py-32">

      <div className="shell max-w-2xl text-center">
        <p className="t-eyebrow text-terra">Error 404</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-5 text-lg text-muted">
          Puede que el enlace esté viejo o que hayamos movido algo de sitio.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link href="/reservar" className="btn btn-primary">Reservar una cita</Link>
          <Link href="/" className="btn btn-outline">Volver al inicio</Link>
        </div>
      </div>
    </section>
  );
}
