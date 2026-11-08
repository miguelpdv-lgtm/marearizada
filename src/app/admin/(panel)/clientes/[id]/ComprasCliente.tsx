import { Badge } from "@/components/admin/ui";
import { formatCOP, formatDate } from "@/lib/format";

export type Compra = {
  id: string;
  /** ISO */
  fecha: string;
  fuente: "Cita" | "Venta";
  sede: string;
  detalle: string;
  monto: number;
};

const TONO_FUENTE: Record<Compra["fuente"], "neutral" | "gold"> = {
  Cita: "neutral",
  Venta: "gold",
};

/** Fusiona productos vendidos dentro de una cita, ventas de mostrador y el
 * histórico importado de AgendaPro — es de solo lectura, a diferencia de
 * `HistorialCliente` no abre nada al hacer clic. */
export function ComprasCliente({ compras }: { compras: Compra[] }) {
  return (
    <div className="divide-y divide-stone border border-stone bg-white">
      {compras.map((c) => (
        <div key={`${c.fuente}-${c.id}`} className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{c.detalle}</p>
            <p className="t-small mt-0.5">
              {formatDate(c.fecha)} · {c.sede}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-ink">{formatCOP(c.monto)}</span>
            <Badge tone={TONO_FUENTE[c.fuente]}>{c.fuente}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
