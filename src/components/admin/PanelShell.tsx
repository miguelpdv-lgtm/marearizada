"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Isotipo } from "@/components/brand/Marca";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export type Icono =
  | "hoy"
  | "agenda"
  | "ventas"
  | "clientes"
  | "servicios"
  | "productos"
  | "promociones"
  | "equipo"
  | "local"
  | "usuarios"
  | "resenas"
  | "galeria"
  | "medios"
  | "reportes"
  | "comisiones"
  | "configuracion";

export type ItemNav = { label: string; href: string; icono: Icono };
export type GrupoNav = { titulo: string | null; items: ItemNav[] };

/** Íconos de trazo, del mismo grosor que los del sitio. */
const TRAZOS: Record<Icono, React.ReactNode> = {
  hoy: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  agenda: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4M7 13.5h3M7 17h6" />
    </>
  ),
  ventas: (
    <>
      <path d="M4 6h16l-1.5 9.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5z" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M9 20.5h.01M15 20.5h.01" />
    </>
  ),
  clientes: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.8 2.6 3 5.2" />
    </>
  ),
  servicios: (
    <>
      <path d="M5 21c0-6 3-9 7-9s7 3 7 9" />
      <path d="M12 12c-2.5 0-4-2-4-4.5S9.5 3 12 3s4 2 4 4.5" />
      <path d="M9.5 7.5c1 1 2 1 3 0s2-1 3 0" />
    </>
  ),
  productos: (
    <>
      <path d="M9 3h6v3l1.5 2v12a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8L9 6z" />
      <path d="M7.5 12h9" />
    </>
  ),
  promociones: (
    <>
      <path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  equipo: (
    <>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 21c.5-4 3.4-6.5 7-6.5s6.5 2.5 7 6.5" />
    </>
  ),
  local: (
    <>
      <path d="M3 10l1.5-6h15L21 10" />
      <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12.5V21h14v-8.5M10 21v-5h4v5" />
    </>
  ),
  usuarios: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2" />
    </>
  ),
  resenas: (
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
  ),
  galeria: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  medios: (
    <>
      <rect x="3" y="5" width="13" height="14" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  reportes: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  comisiones: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.5-1.2-1.6-2-3-2-1.7 0-3 1-3 2.3 0 3.2 6 1.7 6 4.9 0 1.3-1.3 2.3-3 2.3-1.4 0-2.6-.8-3-2M12 5.5v13" />
    </>
  ),
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

function Icon({ nombre, className = "h-5 w-5" }: { nombre: Icono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

/** Ola que corre al pie de la barra lateral. */
function OlaLateral() {
  return (
    <div className="mr-panel-ola" aria-hidden="true">
      <svg viewBox="0 0 560 60" preserveAspectRatio="none">
        <path d="M0 26 Q17.5 14 35 26 T70 26 T105 26 T140 26 T175 26 T210 26 T245 26 T280 26 T315 26 T350 26 T385 26 T420 26 T455 26 T490 26 T525 26 T560 26 V60 H0 Z" fill="#1c6f75" />
        <path d="M0 34 Q17.5 24 35 34 T70 34 T105 34 T140 34 T175 34 T210 34 T245 34 T280 34 T315 34 T350 34 T385 34 T420 34 T455 34 T490 34 T525 34 T560 34 V60 H0 Z" fill="#278e95" />
        <path d="M0 26 Q17.5 14 35 26 T70 26 T105 26 T140 26 T175 26 T210 26 T245 26 T280 26 T315 26 T350 26 T385 26 T420 26 T455 26 T490 26 T525 26 T560 26" fill="none" stroke="#effbfb" strokeWidth="2" opacity=".7" />
      </svg>
    </div>
  );
}

/** Pestañas fijas de la barra inferior en el celular. */
const INFERIOR: Icono[] = ["hoy", "agenda", "ventas", "clientes"];

/**
 * Estructura del panel de Marea Rizada: barra lateral de abismo en
 * escritorio y, en el celular, barra superior corta con pestañas abajo
 * (Hoy, Agenda, Ventas, Clientes y "Más" con el resto).
 */
export function PanelShell({
  grupos,
  user,
  logout,
  children,
}: {
  grupos: GrupoNav[];
  user: { name: string; email: string; role: string };
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mas, setMas] = useState(false);

  // La entrada que más coincide con la ruta es la activa (así "Reportes" no
  // se marca junto con "Comisiones", que vive dentro).
  const todos = grupos.flatMap((g) => g.items);
  const activo = todos
    .map((i) => i.href)
    .filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => setMas(false), [pathname]);
  useEffect(() => {
    if (!mas) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setMas(false);
    document.addEventListener("keydown", cerrar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", cerrar);
      document.body.style.overflow = "";
    };
  }, [mas]);

  const rol = ROLE_LABEL[user.role as Role] ?? user.role;
  const inicial = user.name.trim().charAt(0).toUpperCase() || "M";
  const inferiores = INFERIOR.map((i) => todos.find((t) => t.icono === i)).filter(Boolean) as ItemNav[];
  const masActivo = Boolean(activo) && !inferiores.some((i) => i.href === activo);

  const Navegacion = ({ compacta = false }: { compacta?: boolean }) => (
    <nav aria-label="Panel" className={compacta ? "space-y-5" : "space-y-6"}>
      {grupos.map((g, gi) => (
        <div key={g.titulo ?? gi}>
          {g.titulo && <p className="mr-panel-grupo">{g.titulo}</p>}
          <ul className="space-y-1">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={i.href === activo ? "page" : undefined}
                  className="mr-panel-link"
                >
                  <Icon nombre={i.icono} />
                  <span>{i.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const Usuario = () => (
    <div className="flex items-center gap-3">
      <span className="mr-panel-avatar" aria-hidden="true">
        {inicial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-[#9ee5e7]/80">{rol}</p>
      </div>
      <form action={logout}>
        <button type="submit" className="mr-panel-salir" aria-label="Cerrar sesión" title="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
    </div>
  );

  return (
    <div className="mr-panel">
      {/* --- Escritorio: barra lateral --------------------------------- */}
      <aside className="mr-panel-lateral">
        <Link href="/admin" className="mr-panel-marca" aria-label="Marea Rizada · inicio del panel">
          <Isotipo className="h-11 w-11 shrink-0" />
          <span>
            <b>Marea Rizada</b>
            <small>Panel del salón</small>
          </span>
        </Link>
        <div className="mr-panel-scroll">
          <Navegacion />
        </div>
        <div className="mr-panel-pie">
          <a href="/" target="_blank" rel="noopener noreferrer" className="mr-panel-sitio">
            Ver el sitio
            <span aria-hidden="true">↗</span>
          </a>
          <Usuario />
        </div>
        <OlaLateral />
      </aside>

      {/* --- Celular: barra superior ----------------------------------- */}
      <header className="mr-panel-movil">
        <Link href="/admin" className="flex items-center gap-2.5" aria-label="Marea Rizada · inicio del panel">
          <Isotipo className="h-9 w-9" />
          <b className="font-display text-lg text-white">Marea Rizada</b>
        </Link>
        <span className="mr-panel-avatar ml-auto" aria-hidden="true">
          {inicial}
        </span>
      </header>

      <main className="mr-panel-contenido" id="contenido">
        {children}
      </main>

      {/* --- Celular: pestañas inferiores ------------------------------ */}
      <nav className="mr-panel-tabs" aria-label="Accesos rápidos">
        {inferiores.map((i) => (
          <Link key={i.href} href={i.href} aria-current={i.href === activo ? "page" : undefined}>
            <Icon nombre={i.icono} className="h-6 w-6" />
            <span>{i.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMas(true)} aria-expanded={mas} aria-current={masActivo ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span>Más</span>
        </button>
      </nav>

      {mas && (
        <div className="mr-panel-hoja" role="dialog" aria-modal="true" aria-label="Todo el panel">
          <button type="button" className="mr-panel-velo" aria-label="Cerrar" onClick={() => setMas(false)} />
          <div className="mr-panel-hoja-cuerpo">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-xl text-white">Todo el panel</p>
              <button type="button" onClick={() => setMas(false)} className="mr-panel-salir" aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <Navegacion compacta />
            <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
              <a href="/" target="_blank" rel="noopener noreferrer" className="mr-panel-sitio">
                Ver el sitio <span aria-hidden="true">↗</span>
              </a>
              <Usuario />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
