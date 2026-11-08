import Link from "next/link";

type Variant = "primary" | "dark" | "outline" | "light" | "link";

const variants: Record<Variant, string> = {
  primary: "btn btn-primary",
  dark: "btn btn-dark",
  outline: "btn btn-outline",
  light: "btn btn-light",
  link: "btn-link",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
}) {
  const cls = `${variants[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Acción que llega en una fase posterior: visible, explicada, inactiva. */
export function PhaseButton({
  children,
  phase,
  variant = "outline",
  className = "",
}: {
  children: React.ReactNode;
  phase: number;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        disabled
        className={`${variants[variant]} pointer-events-none opacity-40`}
      >
        {children}
      </button>
      <span className="t-eyebrow text-clay">Disponible en Fase {phase}</span>
    </span>
  );
}

export function PhaseTag({ phase, label }: { phase: number; label?: string }) {
  return (
    <span className="t-eyebrow inline-flex items-center gap-2 border border-stone px-3 py-1.5 text-terra-deep">
      <span className="h-1 w-1 bg-gold-500" />
      {label ?? `Fase ${phase}`}
    </span>
  );
}
