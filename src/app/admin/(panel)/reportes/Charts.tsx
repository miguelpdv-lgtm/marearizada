import { formatCOP } from "@/lib/format";

type Dia = { fecha: string; reservas: number; ingresos: number };

const formatoDia = (fecha: string) => {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
};

export function DailyBookingsChart({ datos }: { datos: Dia[] }) {
  const max = Math.max(...datos.map((d) => d.reservas), 1);

  return (
    <div role="img" aria-label="Reservas por día" className="space-y-3">
      <div className="flex h-44 items-end gap-1.5 border-b border-ink/10 px-1 sm:gap-2">
        {datos.map((dato) => (
          <div key={dato.fecha} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="invisible text-[10px] font-semibold text-terra group-hover:visible">
              {dato.reservas}
            </span>
            <div
              title={`${formatoDia(dato.fecha)}: ${dato.reservas} reservas`}
              className="w-full max-w-9 rounded-t-md bg-terra transition-all group-hover:bg-ink"
              style={{ height: `${Math.max((dato.reservas / max) * 100, dato.reservas ? 4 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 px-1 sm:gap-2">
        {datos.map((dato) => (
          <span key={dato.fecha} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
            {formatoDia(dato.fecha)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RevenueTrendChart({ datos }: { datos: Dia[] }) {
  const width = 640;
  const height = 190;
  const padX = 12;
  const padY = 18;
  const max = Math.max(...datos.map((d) => d.ingresos), 1);
  const step = datos.length > 1 ? (width - padX * 2) / (datos.length - 1) : 0;
  const points = datos
    .map((dato, index) => {
      const x = padX + index * step;
      const y = height - padY - (dato.ingresos / max) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div role="img" aria-label="Tendencia de ingresos" className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" preserveAspectRatio="none">
        <title>Tendencia de ingresos del período</title>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={height - padY - ratio * (height - padY * 2)}
            y2={height - padY - ratio * (height - padY * 2)}
            stroke="var(--color-ink)"
            strokeOpacity=".1"
            strokeDasharray="4 6"
          />
        ))}
        {datos.length > 1 && (
          <>
            <polyline points={points} fill="none" stroke="var(--color-terra)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {datos.map((dato, index) => {
              const x = padX + index * step;
              const y = height - padY - (dato.ingresos / max) * (height - padY * 2);
              return <circle key={dato.fecha} cx={x} cy={y} r="4" fill="var(--color-gold-500)" stroke="var(--color-terra)" strokeWidth="2" />;
            })}
          </>
        )}
      </svg>
      <div className="flex justify-between gap-2 text-[10px] text-muted">
        <span>{datos[0] ? formatoDia(datos[0].fecha) : ""}</span>
        <span>{datos.length > 1 ? formatoDia(datos[datos.length - 1].fecha) : ""}</span>
      </div>
      {datos.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Total atendido: {formatCOP(datos.reduce((total, dato) => total + dato.ingresos, 0))}
        </p>
      )}
    </div>
  );
}

export function BookingOriginChart({ online, manual }: { online: number; manual: number }) {
  const total = online + manual;
  const onlinePct = total ? (online / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label={`Origen de reservas: ${online} online y ${manual} manuales`}
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{
          background: total
            ? `conic-gradient(var(--color-terra) 0 ${onlinePct}%, var(--color-gold-500) ${onlinePct}% 100%)`
            : "var(--color-sand)",
        }}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-paper">
          <strong className="display text-2xl text-ink">{total}</strong>
          <span className="text-[10px] tracking-[0.12em] text-muted uppercase">reservas</span>
        </div>
      </div>
      <div className="w-full space-y-3">
        <Legend color="bg-terra" label="Online" value={online} total={total} />
        <Legend color="bg-gold-500" label="Agenda manual" value={manual} total={total} />
      </div>
    </div>
  );
}

function Legend({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
      <span className="font-semibold text-ink">{value} <span className="font-normal text-muted">({total ? Math.round((value / total) * 100) : 0}%)</span></span>
    </div>
  );
}
