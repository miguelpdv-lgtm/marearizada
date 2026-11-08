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
    <div className="mb-10 border-b-2 border-ink/15 pb-7">
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-terra"
        >
          <span aria-hidden="true">←</span> {breadcrumb.label}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-kicker mb-3">Panel Amicrespa</p>
          <h1 className="t-editorial text-ink">{title}</h1>
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
    <div className="admin-card flex flex-col items-center justify-center border-dashed bg-pink-pale px-6 py-20 text-center">
      <p className="display text-2xl text-ink">{title}</p>
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
  const tones = {
    neutral: "border-stone bg-sand/60 text-muted",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    gold: "border-gold-300/60 bg-gold-50 text-terra-deep",
    danger: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}
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
    <div className="mb-6 flex gap-3 rounded-xl border border-gold-300 bg-gold-50 px-5 py-4 shadow-soft">
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
      <p className="border-b border-ink/10 bg-sand/40 px-4 py-1.5 text-[10px] tracking-[0.1em] text-muted uppercase sm:hidden">
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
      className={`border-b border-ink/10 bg-cream px-5 py-3.5 text-[10px] font-bold tracking-[0.12em] text-muted uppercase ${className}`}
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
    <td className={`border-b border-ink/10 px-5 py-4 align-middle text-sm ${className}`}>
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
