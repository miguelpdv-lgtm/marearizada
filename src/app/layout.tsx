import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

// Tipografía del brandbook: Inter para títulos, subtítulos y cuerpo.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Sustituto de Awesome Serif (fuente comercial, no incluida en el proyecto).
// Si se dejan los archivos en public/fonts/, Awesome Serif toma el relevo:
// va primero en la pila de --font-display definida en globals.css.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default:
      "Amicrespa · Salón especializado en cabello rizado en Barranquilla y Cali",
    template: "%s · Amicrespa",
  },
  description:
    "Salón especializado en cabello crespo, rizado y ondulado. Corte rizo a rizo, hidratación profunda, definición y acompañamiento en tu transición. Barranquilla y Cali.",
  applicationName: "Amicrespa",
  keywords: [
    "salón de cabello rizado",
    "cabello crespo",
    "corte rizo a rizo",
    "transición capilar",
    "Barranquilla",
    "Cali",
  ],
  // La imagen para compartir (opengraph-image.jpg / twitter-image.jpg) vive
  // como archivo en esta carpeta y aplica a todas las páginas. El título y la
  // descripción de cada página los toman WhatsApp, Instagram y Facebook de su
  // <title> y su descripción.
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Amicrespa",
  },
  twitter: {
    card: "summary_large_image",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

/** La barra del navegador en el celular, en el amarillo de la marca. */
export const viewport: Viewport = {
  themeColor: "#f5ec85",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={`${playfair.variable} ${inter.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
