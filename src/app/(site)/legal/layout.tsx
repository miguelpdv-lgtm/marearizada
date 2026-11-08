import Link from "next/link";

/**
 * Envoltorio de las páginas legales, con la misma navegación arriba.
 *
 * El texto de cada una lo redactó el equipo de desarrollo a partir de las
 * obligaciones de la Ley 1480 (Estatuto del Consumidor) y la Ley 1581
 * (protección de datos). Antes de publicar conviene que lo revise un abogado: lo que está escrito describe cómo funciona el sitio de verdad,
 * pero la responsabilidad de que sea suficiente es del negocio.
 */

const PAGINAS = [
  { href: "/legal/terminos", label: "Términos y condiciones" },
  { href: "/legal/privacidad", label: "Tratamiento de datos" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas py-12 md:py-20">
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
              className="border-2 border-stone px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
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
