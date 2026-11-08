"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Isotipo } from "@/components/brand/Marca";
import {
  IconBuscar,
  IconTelefono,
  IconUbicacion,
  IconWhatsApp,
} from "@/components/ui/icons";
import { telLink, whatsappLink } from "@/lib/format";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

const NAV = [
  { label: "Servicios", href: "/servicios" },
  { label: "Productos", href: "/productos" },
  { label: "Nosotros", href: "/nosotras" },
  { label: "Salones", href: "/sucursales" },
];

export function Header({
  bookingHref,
  bookingExternal,
  phone,
  whatsapp,
}: {
  bookingHref: string;
  bookingExternal: boolean;
  /** Ya no se usa: la barra lleva siempre el isotipo del manual. */
  logoUrl?: string | null;
  phone?: string;
  whatsapp?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wa = whatsapp
    ? whatsappLink(whatsapp, "¡Hola Amicrespa! Quiero agendar una cita.")
    : null;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();
    const focusFirst = window.requestAnimationFrame(() => menuCloseRef.current?.focus());
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    window.addEventListener("keydown", closeOnKeyDown);
    media.addEventListener("change", closeOnDesktop);

    return () => {
      window.cancelAnimationFrame(focusFirst);
      unlockBodyScroll();
      window.removeEventListener("keydown", closeOnKeyDown);
      media.removeEventListener("change", closeOnDesktop);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [open]);

  const isActive = (href: string) => pathname.startsWith(href);
  const openMenu = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setOpen(true);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-gold-500 transition-[border-color] duration-300 ${
        scrolled ? "border-ink/15" : "border-transparent"
      }`}
    >
      {/* Barra mínima: isotipo, navegación y "Agendar cita", visibles desde
          el principio en todas las páginas. */}
      <nav aria-label="Navegación principal">
        <div className="shell grid h-[4.5rem] grid-cols-[1fr_auto] items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            aria-label="Amicrespa · inicio"
            className="inline-flex w-fit shrink-0 items-center text-ink transition-opacity hover:opacity-70"
          >
            <Isotipo className="h-7 w-auto" />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium transition-colors hover:text-ink ${
                    active ? "text-ink" : "text-ink/75"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3">
            <button
              type="button"
              aria-label="Buscar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <IconBuscar className="h-[1.15rem] w-[1.15rem]" />
            </button>


            <a
              href={bookingHref}
              target={bookingExternal ? "_blank" : undefined}
              rel={bookingExternal ? "noopener noreferrer" : undefined}
              className="btn btn-dark ml-1 hidden h-9 px-5 py-2 text-[11px] md:inline-flex"
            >
              Agendar cita
            </a>

            <button
              type="button"
              onClick={openMenu}
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              className="inline-flex rounded-full p-1.5 text-ink transition-colors hover:bg-ink/10 lg:hidden"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path d="M3.75 8.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 7.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-navigation"
          ref={menuRef}
          className="fixed inset-0 z-60 flex flex-col bg-gold-500 px-6 py-6 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú móvil"
        >
          <div className="flex items-center justify-between">
            <Isotipo className="h-7 w-auto text-ink" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              ref={menuCloseRef}
              aria-label="Cerrar menú"
              className="inline-flex rounded-full p-1.5 text-ink transition-colors hover:bg-ink/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="mt-8 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`display border-b border-ink/10 py-3 text-[2rem] ${
                  isActive(item.href) ? "text-ink" : "text-ink/75"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <a
              href={bookingHref}
              target={bookingExternal ? "_blank" : undefined}
              rel={bookingExternal ? "noopener noreferrer" : undefined}
              className="btn btn-dark w-full"
            >
              Agendar cita
            </a>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/65">
              <span className="inline-flex items-center gap-1.5">
                <IconUbicacion className="h-4 w-4" />
                Barranquilla · Cali
              </span>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                  <IconWhatsApp className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : phone ? (
                <a href={`tel:${telLink(phone)}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                  <IconTelefono className="h-4 w-4" />
                  {phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
