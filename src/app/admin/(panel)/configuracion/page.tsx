import { redirect } from "next/navigation";
import type { Setting } from "@prisma/client";

import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageSettings } from "@/lib/constants";
import { asegurarAjustes } from "@/lib/ajustes";
import { SettingsGroupForm } from "./SettingsGroupForm";

export const metadata = { title: "Configuración" };

const GROUP_META: Record<string, { title: string; description: string }> = {
  general: {
    title: "General",
    description: "Los textos principales que se ven en la portada.",
  },
  marca: {
    title: "Marca",
    description:
      "Sube aquí el logo oficial. Si lo dejas vacío se usa la versión vectorial incluida en el proyecto.",
  },
  contacto: {
    title: "Contacto",
    description: "WhatsApp, correo y horarios que aparecen en el sitio.",
  },
  redes: {
    title: "Redes sociales",
    description: "Los enlaces del pie de página y de la galería.",
  },
  seo: {
    title: "Google y buscadores",
    description:
      "Verificación del sitio en Google Search Console y Bing. Los datos de cada sede (coordenadas, enlace de reseñas) se editan en Sucursales.",
  },
  fases: {
    title: "Fases del proyecto",
    description:
      "Interruptores de las funcionalidades que llegan en fases posteriores. Actívalos solo cuando esa fase esté implementada.",
  },
  operacion: {
    title: "Operación",
    description: "Ajustes internos del negocio, como la comisión del equipo y las tarifas de envío.",
  },
};

const GROUP_ORDER = ["general", "marca", "contacto", "redes", "seo", "operacion", "fases"];

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canManageSettings(user.role)) redirect("/admin");
  await asegurarAjustes();

  const settings = await prisma.setting.findMany({
    orderBy: [{ group: "asc" }, { order: "asc" }],
  });

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, setting) => {
    (acc[setting.group] ??= []).push(setting);
    return acc;
  }, {});

  const groups = GROUP_ORDER.filter((g) => grouped[g]?.length).concat(
    Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g)),
  );

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Los textos, contactos y ajustes globales del sitio. Los cambios se reflejan de inmediato."
      />

      <div className="divide-y divide-stone/70">
        {groups.map((group) => {
          const meta = GROUP_META[group] ?? { title: group, description: "" };

          return (
            <section key={group} className="py-10 first:pt-0">
              <div className="mb-6 max-w-2xl">
                <h2 className="text-sm font-medium tracking-wide text-ink">
                  {meta.title}
                </h2>
                {meta.description && (
                  <p className="mt-1 text-xs font-normal text-muted">
                    {meta.description}
                  </p>
                )}
              </div>
              <SettingsGroupForm group={group} settings={grouped[group]} />
            </section>
          );
        })}
      </div>
    </>
  );
}
