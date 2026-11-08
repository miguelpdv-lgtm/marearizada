import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";

import { catalogoParaPromociones } from "../catalogo";
import { actualizarPromocion } from "../actions";
import { PromocionForm } from "../PromocionForm";

export const metadata = { title: "Editar promoción" };

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [promocion, catalogo] = await Promise.all([
    prisma.promotion.findUnique({ where: { id } }),
    catalogoParaPromociones(),
  ]);

  if (!promocion) notFound();

  // `bind` fija el id como primer argumento: la acción se sigue usando con la
  // firma (state, formData) que espera `useActionState`.
  const accion = actualizarPromocion.bind(null, promocion.id);

  return (
    <>
      <PageHeader
        title={promocion.name}
        description="Los cambios valen desde ya. Las ventas que ya se hicieron con esta promoción no se tocan."
        breadcrumb={{ label: "Promociones", href: "/admin/promociones" }}
      />
      <PromocionForm action={accion} promocion={promocion} catalogo={catalogo} />
    </>
  );
}
