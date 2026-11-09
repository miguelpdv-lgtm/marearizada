import type { Metadata } from "next";
import Link from "next/link";

import Image from "next/image";

import { Isotipo } from "@/components/brand/Marca";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen bg-[#f2f8f7] lg:grid-cols-2">
      {/* Panel izquierdo: la fachada del salón bajo una capa de abismo y la marea. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0f3236] p-12 lg:flex">
        <Image
          src="/assets/fachada.jpg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover object-[60%_30%] opacity-35"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,50,54,.55),rgba(15,50,54,.92)_70%)]" />

        <div className="relative flex items-center gap-3">
          <Isotipo className="h-14 w-14" />
          <span className="font-display text-2xl font-bold text-white">Marea Rizada</span>
        </div>

        <div className="relative max-w-md pb-16">
          <p className="font-display text-4xl leading-tight font-bold text-white">Recuperamos tus rizos.</p>
          <p className="mt-5 text-sm leading-relaxed text-[#effbfb]/75">
            El panel del salón: agenda de Salón y Nails, clientas, ventas, comisiones y el contenido del sitio.
          </p>
        </div>

        <svg className="absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 600 96" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40q37.5-22 75 0t75 0 75 0 75 0 75 0 75 0 75 0 75 0V96H0z" fill="#1c6f75" />
          <path d="M0 58q37.5-18 75 0t75 0 75 0 75 0 75 0 75 0 75 0 75 0V96H0z" fill="#278e95" />
          <path d="M0 40q37.5-22 75 0t75 0 75 0 75 0 75 0 75 0 75 0 75 0" fill="none" stroke="#effbfb" strokeWidth="2.2" opacity=".75" />
        </svg>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 lg:hidden">
            <Isotipo className="h-11 w-11" />
            <span className="font-display text-xl font-bold text-ink">Marea Rizada</span>
          </div>

          <p className="admin-kicker mt-8 lg:mt-0">Panel del salón</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold text-ink">Hola de nuevo</h1>
          <p className="mt-3 text-sm font-normal text-muted">
            Entra con el correo y la contraseña que te dio la administración del salón.
          </p>

          <LoginForm next={next} />

          <p className="mt-10 border-t border-[#d3e3e1] pt-6 text-xs font-normal text-muted">
            ¿Olvidaste tu contraseña? Pídele a quien administra el panel que te la restablezca desde{" "}
            <span className="text-ink">Usuarios → Editar</span>.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block text-[11px] tracking-[0.14em] text-muted uppercase hover:text-[#1c6f75]"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
