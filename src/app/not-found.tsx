import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esta página no existe",
  robots: { index: false, follow: true },
};

/**
 * 404 de las URLs que no coinciden con ninguna ruta.
 *
 * Es distinta de `(site)/not-found.tsx`: esa se usa cuando una página del
 * sitio llama a `notFound()` —un servicio que ya no existe, un artículo
 * borrado— y ahí sí hay encabezado y pie porque vive dentro de ese layout.
 * Esta, en cambio, se renderiza sobre el layout raíz y no los tiene, así que
 * se pinta sola y ofrece sus propias salidas.
 */
export default function NoEncontradaGlobal() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-20">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-terra uppercase">
          Error 404
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-5 text-lg text-muted">
          Puede que el enlace esté viejo o que hayamos movido algo de sitio.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn btn-primary">Volver al inicio</Link>
          <Link href="/reservar" className="btn btn-outline">Reservar una cita</Link>
        </div>
      </div>
    </main>
  );
}
