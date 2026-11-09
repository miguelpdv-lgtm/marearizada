"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { buscarClientesVenta, type ClienteEncontrado } from "./actions";

/**
 * Lo primero de una venta: buscar a la clienta. Al elegirla se llenan solos
 * su nombre, su celular y, si los tiene, los datos para la factura. Si no
 * existe, "Crear cliente nuevo" deja los campos listos para escribirla; queda
 * guardada en el directorio al registrar la venta (por su celular).
 */
export function BuscadorCliente({
  elegido,
  onElegir,
  onNuevo,
  onCambiar,
}: {
  /** Nombre de la clienta ya elegida, para mostrarla en vez del buscador. */
  elegido: { name: string; phone: string; nuevo: boolean } | null;
  onElegir: (c: ClienteEncontrado) => void;
  /** Crear una nueva: se pasa lo que se escribió para precargar nombre o celular. */
  onNuevo: (texto: string) => void;
  onCambiar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ClienteEncontrado[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, startBuscar] = useTransition();
  const caja = useRef<HTMLDivElement>(null);

  // Busca medio segundo después de dejar de escribir, no en cada tecla.
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      startBuscar(async () => setResultados(await buscarClientesVenta(q)));
    }, 350);
    return () => window.clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  if (elegido) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-ink bg-cream px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.12em] text-muted uppercase">
            {elegido.nuevo ? "Cliente nuevo — se guarda al registrar la venta" : "Del directorio de clientes"}
          </p>
          <p className="truncate text-sm font-semibold text-ink">
            {elegido.name || "Sin nombre todavía"}
            {elegido.phone && <span className="font-normal text-muted"> · {elegido.phone}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTexto("");
            setResultados([]);
            onCambiar();
          }}
          className="text-xs text-marea underline underline-offset-2"
        >
          Cambiar
        </button>
      </div>
    );
  }

  const q = texto.trim();

  return (
    <div ref={caja} className="relative">
      <input
        type="search"
        placeholder="Buscar cliente por nombre, celular o documento…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        className="w-full border border-stone bg-white px-3 py-2.5 text-sm text-ink placeholder:text-clay focus:border-marea focus:outline-none"
      />
      {abierto && q.length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto border border-stone bg-white shadow-lg">
          {buscando && resultados.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">Buscando…</li>
          )}
          {!buscando && resultados.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">No hay clientes con eso.</li>
          )}
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setAbierto(false);
                  onElegir(c);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-cream"
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink">{c.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {c.phone}
                    {c.email && ` · ${c.email}`}
                  </span>
                </span>
                {c.document && <span className="shrink-0 text-xs text-muted">Doc. {c.document}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-stone">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setAbierto(false);
                onNuevo(q);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-semibold text-terra hover:bg-cream"
            >
              + Crear cliente nuevo{/\d/.test(q) ? "" : `: “${q}”`}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
