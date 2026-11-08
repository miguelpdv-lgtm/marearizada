import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import type { Metadata } from "next";

import { bookingTarget, getSettings } from "@/lib/site";

/** Acepta la etiqueta <meta> completa que da el buscador o solo su código. */
function codigoVerificacion(valor: string) {
  const enEtiqueta = valor.match(/content=["']([^"']+)["']/i);
  return (enEtiqueta ? enEtiqueta[1] : valor).trim() || undefined;
}

/**
 * Verificación del sitio en Google Search Console y Bing (Configuración →
 * Google y buscadores). Va en el layout del sitio público para que esté en la
 * portada, que es donde la buscan.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();
    const google = codigoVerificacion(settings.get("seo.googleVerification"));
    const bing = codigoVerificacion(settings.get("seo.bingVerification"));
    if (!google && !bing) return {};
    return {
      verification: {
        google,
        ...(bing ? { other: { "msvalidate.01": bing } } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const booking = bookingTarget(settings);

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-gold-500 focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink focus:shadow-retro"
      >
        Saltar al contenido
      </a>
      <Header
        bookingHref={booking.href}
        bookingExternal={booking.external}
        logoUrl={settings.get("brand.logoUrl") || null}
        phone={settings.get("contact.phone")}
        whatsapp={settings.get("contact.whatsapp")}
      />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}
