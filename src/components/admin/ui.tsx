import Link from "next/link";

/* --- Encabezado de página --------------------------------------------------- */

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  breadcrumb?: { label: string; href: string };
}) {
  return (
    <div className="admin-encabezado">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-[#1c6f75]"
        >
          <span aria-hidden="true">←</span> {breadcrumb.label}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-kicker mb-2.5">Marea Rizada</p>
          <h1 className="font-display text-[2rem] leading-[1.05] font-bold text-ink sm:text-[2.6rem]">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>

        {action && (
          <Link
            href={action.href}
            className="btn btn-primary shrink-0 px-6 py-3 text-sm"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/* --- Contenedores ----------------------------------------------------------- */

export function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="admin-card-header">
      <h2 className="t-card text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="admin-card flex flex-col items-center justify-center !border-dashed !border-[#9ee5e7] bg-[#effbfb] px-6 py-16 text-center">
      <svg viewBox="0 0 64 24" className="mb-4 h-6 w-16" aria-hidden="true">
        <path d="M2 14q7.5-10 15 0t15 0 15 0 15 0" fill="none" stroke="#278e95" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M2 20q7.5-7 15 0t15 0 15 0 15 0" fill="none" stroke="#9ee5e7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="font-display text-2xl font-bold text-ink">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm font-normal text-muted">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="btn btn-primary mt-6 px-6 py-3 text-sm"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* --- Insignias -------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "gold" | "danger";
}) {
  // Insignias de letrero: esquina casi recta, mayúsculas y los colores del
  // sistema (espuma para lo bueno, concha para lo que espera, arcilla roja
  // para lo cancelado).
  const tones = {
    neutral: "border-[#d3e3e1] bg-[#f2f8f7] text-[#5f6b68]",
    success: "border-[#9ee5e7] bg-[#effbfb] text-[#0f3236]",
    warning: "border-[#cdaa9c] bg-[#f7ece7] text-[#7a4436]",
    gold: "border-[#278e95]/40 bg-[#e2f6f6] text-[#1c6f75]",
    danger: "border-[#e3b3a5] bg-[#fbecea] text-[#a8452e]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-[3px] border-[1.5px] px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] whitespace-nowrap uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "success" : "neutral"}>
      {active ? "Visible" : "Oculto"}
    </Badge>
  );
}

/** Marca el contenido cargado por el seed que hay que reemplazar. */
export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex gap-3 rounded-[6px] border-[1.5px] border-dashed border-[#cdaa9c] bg-[#f7ece7] px-5 py-4">
      <span aria-hidden="true" className="font-bold text-terra">
        ✱
      </span>
      <p className="text-sm leading-relaxed text-terra-deep">{children}</p>
    </div>
  );
}

/* --- Tabla ------------------------------------------------------------------ */

/** La tabla siempre exige 640px (`min-w`), así que por debajo de ese ancho
 * —cualquier celular— siempre hay que deslizar para ver el resto de las
 * columnas. Sin este aviso no hay ninguna pista de que se puede: el borde
 * de la tarjeta corta el contenido de golpe, sin barra de scroll visible. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-card">
      <p className="border-b border-[#d3e3e1] bg-[#effbfb] px-4 py-1.5 font-mono text-[10px] tracking-[0.1em] text-[#1c6f75] uppercase sm:hidden">
        Desliza para ver más →
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`border-b-[1.5px] border-[#d3e3e1] bg-[#effbfb] px-5 py-3 font-mono text-[10px] font-medium tracking-[0.12em] text-[#1c6f75] uppercase ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b border-[#e3eeed] px-5 py-3.5 align-middle text-sm ${className}`}>
      {children}
    </td>
  );
}

/* --- Miniatura -------------------------------------------------------------- */

export function Thumb({
  src,
  alt,
  fallback = "📷",
}: {
  src?: string | null;
  alt: string;
  fallback?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-11 w-11 shrink-0 rounded-sm border border-stone/70 object-cover"
      />
    );
  }

  return (
    <span className="media-hatch flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-stone/70 bg-sand/50 text-xs opacity-60">
      {fallback}
    </span>
  );
}
