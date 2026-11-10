"use client";

import { useRouter } from "next/navigation";

/**
 * Fecha y profesional de la agenda. Se aplican al cambiar, sin botón: es lo
 * que más se toca en el día y cada toque de más estorba.
 */
export function FiltrosAgenda({
  base,
  fecha,
  profesional,
  equipo,
}: {
  /** Parámetros que se conservan (vista, línea, sede). */
  base: Record<string, string | undefined>;
  fecha: string;
  profesional: string;
  equipo: { id: string; name: string }[];
}) {
  const router = useRouter();
  const ir = (cambio: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...base, desde: fecha, profesional, ...cambio })) if (v) p.set(k, v);
    router.push(`/admin/agenda?${p.toString()}`);
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="fecha-agenda">
        Ir a una fecha
      </label>
      <input
        id="fecha-agenda"
        type="date"
        value={fecha}
        onChange={(e) => e.target.value && ir({ desde: e.target.value })}
        className="admin-control !min-h-[38px] w-auto px-3 py-1.5 text-sm"
      />
      <label className="sr-only" htmlFor="profesional-agenda">
        Profesional
      </label>
      <select
        id="profesional-agenda"
        value={profesional}
        onChange={(e) => ir({ profesional: e.target.value })}
        className="admin-control !min-h-[38px] w-auto min-w-0 max-w-full px-3 py-1.5 text-sm"
      >
        <option value="">Todo el equipo</option>
        {equipo.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
