"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export type NavItem = { label: string; href: string };
export type NavEntry =
  | { type: "link"; label: string; href: string }
  | { type: "group"; title: string; items: NavItem[] };

/**
 * Barra superior del panel (reemplaza la barra lateral): agrupada por
 * función de negocio en vez de por entidad — Agenda y Clientes al frente
 * porque son las pantallas del día a día, el resto en desplegables. Deja
 * todo el ancho para el contenido, que era el problema de la barra lateral.
 */
export function TopBar({
  nav,
  user,
  branches,
  logout,
}: {
  nav: NavEntry[];
  user: { name: string; email: string; role: string };
  branches: { id: string; city: string }[];
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const selectedBranch = searchParams.get("sede") ?? "";

  // Con rutas anidadas (p. ej. "/admin/reportes" y "/admin/reportes/historico"
  // como entradas separadas), un simple `startsWith` marca las dos activas a
  // la vez. Se calcula el href que más coincide con la ruta actual entre
  // todas las entradas del nav, y solo ese queda marcado.
  const allHrefs = nav.flatMap((entry) => (entry.type === "link" ? [entry.href] : entry.items.map((i) => i.href)));
  const activeHref = allHrefs
    .filter((href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === activeHref;
  const groupActive = (items: NavItem[]) => items.some((i) => isActive(i.href));
  const contextualHref = (href: string) => {
    if (!selectedBranch) return href;
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query ?? "");
    params.set("sede", selectedBranch);
    return `${path}?${params.toString()}`;
  };

  const changeBranch = (branchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId) params.set("sede", branchId);
    else params.delete("sede");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  };

  useEffect(() => {
    setOpenGroup(null);
    setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    if (!openGroup) return;
    const onClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openGroup]);

  const linkClass = (active: boolean) =>
    `flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
      active ? "bg-ink font-semibold text-gold-500" : "text-ink/70 hover:bg-ink/8 hover:text-ink"
    }`;

  return (
    <div ref={barRef} className="sticky top-0 z-40 border-b border-ink/15 bg-gold-500">
      <div className="hidden border-b border-gold-500/10 bg-wine-900 px-6 py-2 text-center lg:block">
        <p className="t-eyebrow text-[10px] tracking-[0.16em] text-gold-500/90">
          Gestión interna · Marea Rizada
        </p>
      </div>

      <div className="flex h-[4.5rem] items-center gap-2 px-4 sm:px-6 lg:h-20">
        <Link href={contextualHref("/admin")} aria-label="Marea Rizada · panel" className="mr-3 flex shrink-0 items-center">
          <Logo variant="dark" markClassName="h-10 w-auto lg:h-12" />
        </Link>

        <label className="hidden items-center gap-2 rounded-lg border border-ink/15 bg-gold-300/50 px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-ink uppercase xl:flex">
          Local
          <select
            value={selectedBranch}
            onChange={(event) => changeBranch(event.target.value)}
            className="bg-transparent text-xs font-semibold normal-case outline-none"
            aria-label="Seleccionar local"
          >
            {branches.length > 1 && <option value="">Ambos locales</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.city}</option>
            ))}
          </select>
        </label>

        {/* Nav de escritorio */}
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((entry) =>
            entry.type === "link" ? (
              <Link key={entry.href} href={contextualHref(entry.href)} className={linkClass(isActive(entry.href))}>
                {entry.label}
              </Link>
            ) : (
              <div key={entry.title} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup((g) => (g === entry.title ? null : entry.title))}
                  aria-expanded={openGroup === entry.title}
                  className={`${linkClass(groupActive(entry.items))} gap-1.5`}
                >
                  {entry.title}
                  <span className={`text-[10px] transition-transform ${openGroup === entry.title ? "-rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>

                {openGroup === entry.title && (
                  <div className="absolute top-full left-0 z-50 mt-2 min-w-48 rounded-xl border border-ink/15 bg-paper p-1.5 shadow-lifted">
                    {entry.items.map((item) => (
                      <Link
                        key={item.href}
                        href={contextualHref(item.href)}
                        onClick={() => setOpenGroup(null)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive(item.href)
                             ? "bg-gold-500 font-semibold text-ink"
                             : "text-muted hover:bg-cream hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>

        {/* Usuario (escritorio) */}
        <div className="ml-auto hidden shrink-0 items-center gap-4 lg:flex">
          <div className="text-right leading-tight">
            <p className="truncate text-xs font-semibold text-ink">{user.name}</p>
            <p className="text-[10px] tracking-[0.1em] text-terra-deep uppercase">
              {ROLE_LABEL[user.role as Role] ?? user.role}
            </p>
          </div>
          <Link
            href="/"
            target="_blank"
            className="link-underline text-[10px] tracking-[0.14em] text-ink/70 uppercase transition-colors hover:text-ink"
          >
            Ver sitio ↗
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-[10px] tracking-[0.14em] text-ink/70 uppercase transition-colors hover:text-terra"
            >
              Salir
            </button>
          </form>
        </div>

        {/* Botón hamburguesa (móvil) */}
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          aria-label={openMobile ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={openMobile}
          className="ml-auto flex h-10 w-10 flex-col items-center justify-center gap-[5px] text-ink lg:hidden"
        >
          <span className={`block h-px w-6 bg-current transition-transform ${openMobile ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`block h-px w-6 bg-current transition-opacity ${openMobile ? "opacity-0" : ""}`} />
          <span className={`block h-px w-6 bg-current transition-transform ${openMobile ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Nav de móvil */}
      {openMobile && (
          <nav className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-ink/15 bg-cream px-4 py-4 lg:hidden">
          <label className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-gold-50 px-3 py-3 text-[10px] font-bold tracking-[0.12em] text-ink uppercase">
            Local
            <select
              value={selectedBranch}
              onChange={(event) => changeBranch(event.target.value)}
              className="max-w-[11rem] bg-transparent text-right text-xs font-semibold normal-case outline-none"
              aria-label="Seleccionar local"
            >
              {branches.length > 1 && <option value="">Ambos locales</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.city}</option>
              ))}
            </select>
          </label>
          {nav.map((entry) =>
            entry.type === "link" ? (
              <Link key={entry.href} href={contextualHref(entry.href)} className={`${linkClass(isActive(entry.href))} mb-0.5`}>
                {entry.label}
              </Link>
            ) : (
              <div key={entry.title} className="mb-3 last:mb-0">
                <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-clay uppercase">
                  {entry.title}
                </p>
                {entry.items.map((item) => (
                  <Link key={item.href} href={contextualHref(item.href)} className={`${linkClass(isActive(item.href))} mb-0.5`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ),
          )}

          <div className="mt-4 border-t border-stone/70 pt-4">
             <p className="truncate px-3 text-sm font-semibold text-ink">{user.name}</p>
             <p className="truncate px-3 text-xs text-muted">{user.email}</p>
            <p className="px-3 pt-0.5 text-[10px] tracking-[0.12em] text-terra-deep uppercase">
              {ROLE_LABEL[user.role as Role] ?? user.role}
            </p>
            <div className="mt-3 flex items-center gap-4 px-3">
               <Link href="/" target="_blank" className="text-[10px] tracking-[0.14em] text-ink/70 uppercase hover:text-ink">
                Ver sitio ↗
              </Link>
              <form action={logout}>
                 <button type="submit" className="text-[10px] tracking-[0.14em] text-ink/70 uppercase hover:text-terra">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
