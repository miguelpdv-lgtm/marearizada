import Link from "next/link";

import { ManchasSeccion } from "@/components/brand/Manchas";

/**
 * Envoltorio de las tres páginas legales.
 *
 * Van juntas y con la misma navegación porque se leen juntas: quien busca la
 * política de devoluciones suele venir de los términos, y quien llega por el
 * pie del sitio no sabe en cuál de las tres está lo que necesita.
 *
 * El texto de cada una lo redactó el equipo de desarrollo a partir de las
 * obligaciones de la Ley 1480 (Estatuto del Consumidor) y la Ley 1581
 * (protección de datos). Antes de publicar conviene que lo revise el contador
 * o un abogado: lo que está escrito describe cómo funciona el sitio de verdad,
 * pero la responsabilidad de que sea suficiente es del negocio.
 */

const PAGINAS = [
  { href: "/legal/terminos", label: "Términos y condiciones" },
  { href: "/legal/privacidad", label: "Tratamiento de datos" },
  { href: "/legal/devoluciones", label: "Cambios y devoluciones" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="con-manchas bg-canvas py-12 md:py-20">
      <ManchasSeccion sobre="claro" variante={1} semilla={25} />
      <div className="shell max-w-4xl">
        <div className="bg-paper px-5 py-8 md:px-14 md:py-14">
        <nav
          aria-label="Documentos legales"
          className="mb-10 flex flex-wrap gap-2 border-b border-cream pb-6"
        >
          {PAGINAS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-gold-500"
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <article className="legal">{children}</article>
        </div>
      </div>
    </div>
  );
}
