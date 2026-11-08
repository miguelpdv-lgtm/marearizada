import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { storageConfigurado } from "@/lib/storage";
import { MediaSlotForm } from "./MediaSlotForm";

export const metadata = { title: "Espacios de medios" };

export default async function MediaAdminPage() {
  // "pagina.blog" era la portada del blog, que ya no existe. La fila se
  // deja en la base (con su archivo, si tiene) pero no se muestra.
  const slots = await prisma.mediaSlot.findMany({
    where: { key: { not: "pagina.blog" } },
    orderBy: { order: "asc" },
  });

  const filled = slots.filter((s) => s.url).length;

  // Agrupa por sección conservando el orden del diseño.
  const sections = slots.reduce<Record<string, typeof slots>>((acc, slot) => {
    (acc[slot.section] ??= []).push(slot);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Espacios de medios"
        description="Los videos y fotografías marcados en el diseño. Sube el archivo y el sitio reemplaza el marcador por el material real."
      />

      {!storageConfigurado() && (
        <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm text-red-700">
            <strong>La subida de archivos está desactivada.</strong> Falta{" "}
            <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> en el
            archivo <span className="font-mono">.env</span>. Mientras tanto
            puedes seguir pegando URLs externas.
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 border border-stone/70 bg-white px-6 py-5">
        <div>
          <p className="display text-3xl text-ink">
            {filled}
            <span className="text-xl text-clay">/{slots.length}</span>
          </p>
          <p className="mt-0.5 text-xs font-normal text-muted">
            espacios con material cargado
          </p>
        </div>

        <div className="ml-auto max-w-md text-xs leading-relaxed font-normal text-muted">
          Sube el video o la foto directo desde cada espacio, abajo. Queda
          alojado en tu propio Storage — nada vive en el proyecto ni en un
          servicio externo.
        </div>
      </div>

      {Object.entries(sections).map(([section, items]) => (
        <section key={section} className="mb-12 last:mb-0">
          <h2 className="mb-5 border-b border-stone/70 pb-3 text-sm font-medium tracking-wide text-ink">
            {section}
            <span className="ml-3 text-xs font-normal text-muted">
              {items.filter((i) => i.url).length}/{items.length}
            </span>
          </h2>

          <div className="grid gap-5 xl:grid-cols-2">
            {items.map((slot) => (
              <MediaSlotForm key={slot.key} slot={slot} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
