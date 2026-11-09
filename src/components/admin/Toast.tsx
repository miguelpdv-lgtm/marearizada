"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Aviso flotante de confirmación. Aparece arriba al centro, sobre todo el
 * contenido, y se va solo a los pocos segundos — así se ve aunque el
 * formulario sea largo y el botón de guardar quede al final.
 */
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-6 z-[100] flex justify-center px-4"
    >
      <div className="admin-toast">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 15c3-3 6-3 9 0s6 3 9 0M8 8l3 3 6-6" />
        </svg>
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="ml-2 text-lg leading-none text-[#9ee5e7] transition-colors hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const ENTIDAD: Record<string, string> = {
  productos: "Producto",
  servicios: "Servicio",
};

/**
 * Muestra el aviso cuando una acción redirige con `?ok=creado`,
 * `?ok=eliminado`, etc., y luego limpia el parámetro de la URL para que no
 * vuelva a salir al recargar.
 */
export function OkToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const ok = params.get("ok");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    const entidad = ENTIDAD[pathname.split("/")[2] ?? ""];
    const accion = ok.startsWith("elimin") ? "eliminado" : "guardado";
    setMessage(entidad ? `${entidad} ${accion} exitosamente.` : `Registro ${accion} exitosamente.`);

    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    window.history.replaceState(window.history.state, "", url);
  }, [ok, pathname]);

  const cerrar = useCallback(() => setMessage(null), []);

  return message ? <Toast message={message} onClose={cerrar} /> : null;
}
