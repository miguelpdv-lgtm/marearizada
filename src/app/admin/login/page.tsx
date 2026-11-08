import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo: marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-wine-900 p-12 lg:flex">
        {/* El resplandor amarillo retoma el gesto cromático del header público. */}
        {/* rgb(232,204,90) = gold-500 real del manual. Un gradiente
            necesita el color literal, no puede tomar la var() de Tailwind. */}
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_20%_10%,rgba(232,204,90,0.25),transparent_60%)]" />
        <div className="media-hatch absolute inset-0 opacity-30" />

        <div className="relative">
          <Logo variant="light" markClassName="h-14 w-auto" />
        </div>

        <div className="relative max-w-md">
          <p className="display text-3xl leading-snug text-white">
            El lugar que te hubiera gustado conocer de pequeña.
          </p>
          <p className="mt-6 text-xs leading-relaxed font-normal text-white/55">
            Panel administrativo · Fase 1. Desde aquí se gestionan los servicios,
            los productos, el contenido del sitio y los usuarios del equipo.
          </p>
        </div>

        <p className="relative text-[10px] tracking-[0.2em] text-white/55 uppercase">
          Tu lo mereces
        </p>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo variant="dark" markClassName="h-11 w-auto" />
          </div>

          <p className="t-eyebrow mt-8 text-terra-deep lg:mt-0">Panel administrativo</p>
          <h1 className="t-editorial mt-4 text-ink">Bienvenida de vuelta</h1>
          <p className="mt-3 text-sm font-normal text-muted">
            Entra con el correo que te asignaron para gestionar el sitio.
          </p>

          <LoginForm next={next} />

          <p className="mt-10 border-t border-stone/70 pt-6 text-xs font-normal text-muted">
            ¿Olvidaste tu contraseña? Pídele a un administrador que te la
            restablezca desde{" "}
            <span className="text-ink">Usuarios → Editar</span>.
          </p>

          <Link
            href="/"
            className="link-underline mt-6 inline-block text-[11px] tracking-[0.14em] text-muted uppercase hover:text-terra"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
