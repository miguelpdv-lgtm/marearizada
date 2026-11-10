"use client";

import { useEffect } from "react";

/**
 * Se pone dentro de una ventana emergente del panel: la cierra con la tecla
 * Escape y, mientras está abierta, evita que la página de fondo se desplace.
 */
export function CerrarConEscape({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", tecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);
  return null;
}
