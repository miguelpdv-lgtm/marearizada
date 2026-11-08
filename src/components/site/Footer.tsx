import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { getBranches, getSettings } from "@/lib/site";
import { telLink } from "@/lib/format";

const EXPLORA = [
  { label: "Servicios", href: "/servicios" },
  { label: "Productos", href: "/productos" },
  { label: "Nosotros", href: "/nosotras" },
  { label: "Salones", href: "/sucursales" },
];

const LEGALES = [
  { label: "Términos", href: "/legal/terminos" },
  { label: "Tratamiento de datos", href: "/legal/privacidad" },
  { label: "Cambios y devoluciones", href: "/legal/devoluciones" },
];

/**
 * Pie del sitio, en vino (la combinación PRINCIPAL del manual).
 *
 * Liviano a propósito: solo lo que alguien busca al llegar al final de la
 * página. Los horarios completos, las descripciones y los mapas viven en
 * /sucursales; acá cada sede es ciudad, dirección y cómo llegar.
 *
 *   1. El logo, solo.
 *   2. Tres columnas cortas en texto: explora, salones y contacto.
 *   3. Una línea fina con lo legal.
 */
export async function Footer() {
  const [settings, branches] = await Promise.all([getSettings(), getBranches()]);

  const redes = [
    { label: "Instagram", href: settings.get("social.instagram") },
    { label: "TikTok", href: settings.get("social.tiktok") },
    { label: "Facebook", href: settings.get("social.facebook") },
  ].filter((r) => r.href);
  const email = settings.get("contact.email");
  const phone = settings.get("contact.phone");

  return (
    <footer id="contacto" className="bg-ink text-paper">
      <div className="shell">
        {/* 1 · Marca */}
        <div className="border-b border-paper/15 py-12 md:py-14">
          <Logo src={settings.get("brand.logoUrl") || null} variant="light" markClassName="h-12 w-auto md:h-14" />
        </div>

        {/* 2 · Explora, salones y contacto */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 md:grid-cols-[1fr_2fr_1.2fr] md:gap-10 md:py-12">
          <Columna titulo="Explora">
            <nav aria-label="Explora el sitio">
              <ul className="space-y-2.5">
                {EXPLORA.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={enlace}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Columna>

          {branches.length > 0 && (
            <Columna titulo="Salones" className="col-span-2 row-start-1 md:col-span-1 md:row-start-auto">
              <ul className="grid grid-cols-2 gap-6">
                {branches.map((b) => (
                  <li key={b.id}>
                    <Link href={`/sucursales/${b.slug}`} className="block font-semibold text-paper hover:underline">
                      {b.city}
                    </Link>
                    <p className="mt-1 text-paper/70">
                      {b.address}
                      {b.neighborhood && ` · ${b.neighborhood}`}
                    </p>
                    {b.closedNotice ? (
                      <p className="mt-1 text-gold-500">Cerrada temporalmente</p>
                    ) : (
                      b.mapsUrl && (
                        <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-block ${enlace}`}>
                          Cómo llegar
                        </a>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </Columna>
          )}

          <Columna titulo="Contacto">
            <ul className="space-y-2.5">
              {phone && (
                <li>
                  <a href={`tel:${telLink(phone)}`} className={enlace}>
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className={`break-all ${enlace}`}>
                    {email}
                  </a>
                </li>
              )}
              {redes.map((r) => (
                <li key={r.label}>
                  <a href={r.href} target="_blank" rel="noopener noreferrer" className={enlace}>
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </Columna>
        </div>

        {/* 3 · Legal. Los documentos van en el pie de todas las páginas: la
            Ley 1480 pide que estén a la vista antes de comprar. */}
        <div className="flex flex-col gap-3 border-t border-paper/15 py-6 text-xs text-paper/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} AMICRESPA SALON ACADEMIA S.A.S.</p>
          <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGALES.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-paper">
                {l.label}
              </Link>
            ))}
            <Link href="/admin" className="transition-colors hover:text-paper">
              Acceso administrativo
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

const enlace = "text-paper/85 transition-colors hover:text-gold-500";

function Columna({
  titulo,
  className = "",
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 text-sm ${className}`}>
      <p className="t-eyebrow mb-4 text-gold-500">{titulo}</p>
      {children}
    </div>
  );
}
