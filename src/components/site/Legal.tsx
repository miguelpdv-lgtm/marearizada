/**
 * Piezas compartidas por las tres páginas legales.
 *
 * Existen para que los documentos se escriban como texto y no como una sopa de
 * clases de Tailwind repetidas: lo que cambia entre ellos es el contenido, no
 * la tipografía.
 */

import { getSettings } from "@/lib/site";

export type Empresa = {
  /** Quién responde: la razón social si ya está, si no "Marea Rizada". */
  titular: string;
  nit: string;
  ciudad: string;
  correo: string;
};

/** Datos del titular, editables en Configuración → General. */
export async function datosEmpresa(): Promise<Empresa> {
  const s = await getSettings();
  return {
    titular: s.get("legal.razonSocial").trim() || "Marea Rizada",
    nit: s.get("legal.nit").trim(),
    ciudad: s.get("legal.ciudad").trim() || "Colombia",
    correo: s.get("contact.email").trim(),
  };
}

/** "Marea Rizada (NIT 900.000.000)" o solo el titular si falta el NIT. */
export function titularConNit(e: Empresa) {
  return e.nit ? `${e.titular}, identificado con NIT ${e.nit}` : e.titular;
}

/** El correo como enlace, o una frase genérica si aún no está configurado. */
export function Correo({ empresa }: { empresa: Empresa }) {
  if (!empresa.correo) return <>los canales de contacto publicados en este sitio</>;
  return (
    <a href={`mailto:${empresa.correo}`} className="text-terra-deep underline">
      {empresa.correo}
    </a>
  );
}

export function TituloLegal({
  children,
  actualizado,
  empresa,
}: {
  children: React.ReactNode;
  actualizado: string;
  empresa: Empresa;
}) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{children}</h1>
      <p className="mt-3 text-sm text-clay">
        Última actualización: {actualizado} · {empresa.titular}
        {empresa.nit && ` · NIT ${empresa.nit}`}
      </p>
    </header>
  );
}

export function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-0">
      <h2 className="font-display text-xl text-ink md:text-2xl">{titulo}</h2>
      <div className="mt-3 space-y-4 text-[15px] leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function Lista({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-terra">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Para los plazos y cifras que la ley fija y no se pueden cambiar sin más. */
export function Destacado({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-2 border-stone bg-canvas px-5 py-4 text-[15px] leading-relaxed text-ink">
      {children}
    </p>
  );
}
