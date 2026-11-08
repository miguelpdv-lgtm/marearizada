import type { Metadata, Viewport } from "next";
import { Figtree, Martian_Mono, Shantell_Sans } from "next/font/google";

import "./globals.css";

// Tipografías del sistema de diseño de Marea Rizada.
const shantell = Shantell_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-shantell",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-martian",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: "Marea Rizada · Expertos en salud capilar",
    template: "%s · Marea Rizada",
  },
  description:
    "Salón especializado en salud capilar y rizos. Diagnóstico, corte rizo a rizo y rutinas para cada patrón, del 2A al 4C. Agenda tu cita en línea.",
  applicationName: "Marea Rizada",
  keywords: ["salón de rizos", "cabello rizado", "corte rizo a rizo", "salud capilar", "diagnóstico capilar"],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Marea Rizada",
  },
  twitter: {
    card: "summary_large_image",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

/** La barra del navegador en el celular, en el abismo de la marca. */
export const viewport: Viewport = {
  themeColor: "#0f3236",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={`${shantell.variable} ${figtree.variable} ${martian.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
