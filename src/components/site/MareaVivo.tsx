"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Activa las piezas animadas del sitio que estén en la página: olas de
 * canvas, franja de patrones, "Descubre tu patrón", antes/después y, en la
 * portada, la intro del logo. Los scripts son los mismos de la landing
 * estática; se cargan solo en el navegador.
 */
export function MareaVivo() {
  // Al navegar dentro del sitio se vuelve a buscar qué activar en la página nueva.
  const ruta = usePathname();
  useEffect(() => {
    let vivo = true;
    (async () => {
      await import("@/lib/marea/tide.js");
      // La intro solo corre si el script del layout la dejó pendiente.
      await import("@/lib/marea/intro.js");
      const { iniciarMarea } = await import("@/lib/marea/landing.js");
      if (vivo) iniciarMarea();
    })();
    return () => {
      vivo = false;
    };
  }, [ruta]);
  return null;
}
