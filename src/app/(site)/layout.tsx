import type { Metadata } from "next";

import { Footer } from "@/components/site/Footer";
import { Header, SpriteMarca } from "@/components/site/Header";
import { MareaVivo } from "@/components/site/MareaVivo";

import { bookingTarget, getSettings } from "@/lib/site";

import "./marea.css";

/* Intro del logo: solo en la portada, una vez por sesión y nunca con
   "reducir movimiento". Corre antes de pintar la cabecera. */
const INTRO = `(function(){try{if(location.pathname!=="/"||matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem("mr-intro-seen"))return;}catch(e){return;}document.documentElement.classList.add("mr-intro-pending");})();`;

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
      <script dangerouslySetInnerHTML={{ __html: INTRO }} />
      <SpriteMarca />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-paper focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-ink"
      >
        Saltar al contenido
      </a>
      <Header bookingHref={booking.href} bookingExternal={booking.external} />
      <main id="contenido">{children}</main>
      <Footer />
      <MareaVivo />
    </>
  );
}
