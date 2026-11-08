"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Buscador para las listas del panel. Escribe en el parámetro `q` de la URL
 * (con una pausa corta para no recargar en cada tecla) y deja intactos los
 * demás parámetros, como la sede. El filtrado lo hace la página en el
 * servidor, así que la búsqueda sobrevive a recargar o compartir el enlace.
 */
export function BuscadorLista({ placeholder = "Buscar…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const [cargando, iniciar] = useTransition();
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const siguiente = new URLSearchParams(params.toString());
      if (texto.trim()) siguiente.set("q", texto.trim());
      else siguiente.delete("q");
      const qs = siguiente.toString();
      iniciar(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 250);
    return () => window.clearTimeout(t);
    // Solo reacciona a lo que se escribe; `params` cambia con cada replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full border border-stone bg-paper pr-10 pl-5 text-sm text-ink outline-none placeholder:text-clay focus:border-ink"
      />
      {cargando && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted" aria-hidden>
          …
        </span>
      )}
    </div>
  );
}
