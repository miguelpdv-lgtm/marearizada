import path from "node:path";
import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todo el sitio.
 *
 * No hay CSP acá a propósito: el checkout carga el script de Bold y el panel
 * usa estilos en línea de Next, así que una CSP real necesita nonces y se
 * arma aparte. Lo de abajo es lo que sí se puede poner sin romper nada.
 */
const CABECERAS = [
  // HSTS. Un año, con subdominios. Vercel ya sirve solo por HTTPS; esto le
  // dice al navegador que ni siquiera intente el primer salto por HTTP.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Nada de adivinar el tipo de un archivo por su contenido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // El panel no debe poder embeberse en un iframe ajeno: es la defensa
  // contra clickjacking sobre los botones de facturar y anular.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Al salir del sitio se manda el origen, no la URL completa: una URL de
  // pedido lleva la referencia y su token.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El sitio no usa ninguna de las tres. Se apagan explícitamente.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Fija la raíz del workspace en esta carpeta. Sin esto, si hay otro
  // package-lock.json en un directorio padre, Next.js la deduce mal.
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    // Solo Supabase Storage, que es a donde sube el panel. El comodín que
    // había antes (hostname: "**") convertía /_next/image en un proxy abierto:
    // cualquiera podía pasarle una URL ajena y quemar la cuota de
    // transformaciones. Si alguna vez hace falta un host externo, se agrega
    // acá uno por uno.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uzpllyvrtmksenvkjaei.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS }];
  },
  // El blog se retiró: los enlaces viejos (buscadores, redes) caen en la
  // portada en vez de un 404.
  async redirects() {
    return [
      { source: "/blog", destination: "/", permanent: true },
      { source: "/blog/:slug*", destination: "/", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
