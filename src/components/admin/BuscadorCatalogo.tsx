"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { formatCOP } from "@/lib/format";

export type OpcionCatalogo = {
  kind: "SERVICE" | "PRODUCT";
  id: string;
  name: string;
  price: number;
  /** Solo servicios. */
  durationMin?: number;
};

/** Descuento al agregar: en porcentaje o en pesos fijos. */
export type DescuentoAlAgregar = { tipo: "PCT" | "PESOS"; valor: number };

export type ProfesionalOpcion = { id: string; name: string; branchId: string | null };

/** Sin tildes ni mayúsculas: "hidratacion" encuentra "Hidratación". */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Buscar y agregar productos y servicios por nombre, cada uno con la
 * profesional que lo vendió. Reemplaza los selects largos: con 150 productos
 * nadie encuentra nada bajando por una lista.
 *
 * Se escribe, se elige con clic o con ↑ ↓ y Enter, y la línea se agrega con
 * la cantidad y la profesional que estén puestas (la profesional se recuerda
 * para la siguiente, que casi siempre es la misma).
 */
export function BuscadorCatalogo({
  opciones,
  equipo,
  profesionalInicial = "",
  conCantidad = true,
  conDescuento = false,
  disabled = false,
  onAgregar,
}: {
  opciones: OpcionCatalogo[];
  equipo: ProfesionalOpcion[];
  /** Profesional preseleccionada (p. ej. la de la cita). */
  profesionalInicial?: string;
  conCantidad?: boolean;
  /** Muestra la casilla de descuento (en % o en pesos) al agregar. */
  conDescuento?: boolean;
  disabled?: boolean;
  onAgregar: (
    opcion: OpcionCatalogo,
    cantidad: number,
    staffId: string,
    descuento: DescuentoAlAgregar,
  ) => void;
}) {
  const idLista = useId();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [elegido, setElegido] = useState<OpcionCatalogo | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [staffId, setStaffId] = useState(profesionalInicial);
  const [dcto, setDcto] = useState(0);
  const [tipoDcto, setTipoDcto] = useState<DescuentoAlAgregar["tipo"]>("PCT");
  const caja = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => {
    const q = normalizar(texto);
    if (!q) return [];
    const palabras = q.split(/\s+/);
    return opciones
      .filter((o) => {
        const n = normalizar(o.name);
        return palabras.every((p) => n.includes(p));
      })
      .slice(0, 12);
  }, [opciones, texto]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const elegir = (o: OpcionCatalogo) => {
    setElegido(o);
    setTexto(o.name);
    setAbierto(false);
  };

  const agregar = () => {
    if (!elegido) return;
    onAgregar(elegido, conCantidad ? cantidad : 1, staffId, {
      tipo: tipoDcto,
      valor: conDescuento ? dcto : 0,
    });
    setElegido(null);
    setTexto("");
    setCantidad(1);
    setDcto(0);
  };

  return (
    <div className="space-y-2">
      <div ref={caja} className="relative">
        <input
          type="search"
          role="combobox"
          aria-expanded={abierto && resultados.length > 0}
          aria-controls={idLista}
          aria-autocomplete="list"
          placeholder="Buscar producto o servicio por nombre…"
          value={texto}
          disabled={disabled}
          onChange={(e) => {
            setTexto(e.target.value);
            setElegido(null);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActivo((a) => Math.min(a + 1, resultados.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (abierto && resultados[activo]) elegir(resultados[activo]);
              else if (elegido) agregar();
            } else if (e.key === "Escape") {
              setAbierto(false);
            }
          }}
          className="w-full border border-stone bg-white px-3 py-2.5 text-sm text-ink placeholder:text-clay focus:border-marea focus:outline-none disabled:opacity-60"
        />
        {abierto && texto && (
          <ul
            id={idLista}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-stone bg-white shadow-lg"
          >
            {resultados.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted">Nada con ese nombre.</li>
            ) : (
              resultados.map((o, i) => (
                <li
                  key={`${o.kind}-${o.id}`}
                  role="option"
                  aria-selected={i === activo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegir(o);
                  }}
                  onMouseEnter={() => setActivo(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                    i === activo ? "bg-cream" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{o.name}</span>
                    <span className="text-[11px] tracking-[0.08em] text-muted uppercase">
                      {o.kind === "SERVICE"
                        ? `Servicio${o.durationMin ? ` · ${o.durationMin} min` : ""}`
                        : "Producto"}
                    </span>
                  </span>
                  <span className="shrink-0 text-ink">{formatCOP(o.price)}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div
        className={`grid gap-2 ${
          conCantidad && conDescuento
            ? "grid-cols-[4.5rem_8rem_1fr_auto]"
            : conCantidad
              ? "grid-cols-[4.5rem_1fr_auto]"
              : "grid-cols-[1fr_auto]"
        }`}
      >
        {conCantidad && (
          <input
            type="number"
            min={1}
            aria-label="Cantidad"
            title="Cantidad"
            value={cantidad}
            disabled={disabled}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
            className="w-full border border-stone bg-white px-3 py-2 text-sm text-ink focus:border-marea focus:outline-none disabled:opacity-60"
          />
        )}
        {conDescuento && (
          <div className="flex items-center border border-stone bg-white focus-within:border-terra">
            <input
              type="number"
              min={0}
              max={tipoDcto === "PCT" ? 100 : undefined}
              step="any"
              aria-label={tipoDcto === "PCT" ? "Descuento en porcentaje" : "Descuento en pesos"}
              placeholder="Dcto"
              value={dcto || ""}
              disabled={disabled}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                setDcto(tipoDcto === "PCT" ? Math.min(100, v) : v);
              }}
              className="w-full min-w-0 bg-transparent px-2 py-2 text-right text-sm text-ink focus:outline-none disabled:opacity-60"
            />
            {/* % o pesos fijos: un toque cambia la unidad. */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setTipoDcto((t) => (t === "PCT" ? "PESOS" : "PCT"));
                setDcto(0);
              }}
              title="Cambiar entre porcentaje y valor fijo"
              aria-label={tipoDcto === "PCT" ? "Cambiar a descuento en pesos" : "Cambiar a descuento en porcentaje"}
              className="shrink-0 border-l border-stone px-2.5 py-2 text-sm font-semibold text-ink hover:bg-cream"
            >
              {tipoDcto === "PCT" ? "%" : "$"}
            </button>
          </div>
        )}
        <select
          aria-label="Profesional que lo vendió"
          value={staffId}
          disabled={disabled}
          onChange={(e) => setStaffId(e.target.value)}
          className="w-full border border-stone bg-white px-3 py-2 text-sm text-ink focus:border-marea focus:outline-none disabled:opacity-60"
        >
          <option value="">Vendió: sin asignar</option>
          {equipo.map((p) => (
            <option key={p.id} value={p.id}>
              Vendió: {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={agregar}
          disabled={disabled || !elegido}
          className="btn btn-outline px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
