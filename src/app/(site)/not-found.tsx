import Link from "next/link";
import type { Metadata } from "next";
import { ManchasSeccion } from "@/components/brand/Manchas";

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
    <section className="con-manchas bg-canvas py-24 md:py-32">
      <ManchasSeccion sobre="claro" variante={0} semilla={24} />

      <div className="shell max-w-2xl text-center">
        <p className="t-eyebrow text-terra">Error 404</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-5 text-lg text-muted">
          Puede que el enlace esté viejo o que hayamos movido algo de sitio. Lo
          que buscas seguramente está en una de estas:
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Enlace href="/servicios">Ver los servicios</Enlace>
          <Enlace href="/productos">Ir a la tienda</Enlace>
          <Enlace href="/reservar">Reservar una cita</Enlace>
          <Enlace href="/">Volver al inicio</Enlace>
        </div>
      </div>
    </section>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-cream bg-bone px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}
