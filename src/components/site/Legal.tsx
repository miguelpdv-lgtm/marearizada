/**
 * Piezas compartidas por las tres páginas legales.
 *
 * Existen para que los documentos se escriban como texto y no como una sopa de
 * clases de Tailwind repetidas: lo que cambia entre ellos es el contenido, no
 * la tipografía.
 */

export const EMPRESA = {
  razonSocial: "AMICRESPA SALON ACADEMIA S.A.S.",
  nit: "901.443.375",
  marca: "Amicrespa",
  correo: "amicrespa@gmail.com",
  ciudades: "Barranquilla y Cali, Colombia",
} as const;

export function TituloLegal({
  children,
  actualizado,
}: {
  children: React.ReactNode;
  actualizado: string;
}) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">
        {children}
      </h1>
      <p className="mt-3 text-sm text-clay">
        Última actualización: {actualizado} · {EMPRESA.razonSocial} · NIT{" "}
        {EMPRESA.nit}
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
        <li key={i} className="list-disc marker:text-pink">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Para los plazos y cifras que la ley fija y no se pueden cambiar sin más. */
export function Destacado({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-pink-soft bg-pink-pale px-5 py-4 text-[15px] leading-relaxed text-ink">
      {children}
    </p>
  );
}
