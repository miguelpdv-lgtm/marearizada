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
      <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-lg">
        <span aria-hidden className="text-base">✓</span>
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="ml-2 text-emerald-700 transition-colors hover:text-emerald-900"
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
