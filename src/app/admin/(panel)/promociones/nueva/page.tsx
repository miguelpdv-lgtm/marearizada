import { PageHeader } from "@/components/admin/ui";

import { catalogoParaPromociones } from "../catalogo";
import { crearPromocion } from "../actions";
import { PromocionForm } from "../PromocionForm";

export const metadata = { title: "Nueva promoción" };

export default async function NuevaPromocionPage() {
  const catalogo = await catalogoParaPromociones();

  return (
    <>
      <PageHeader
        title="Nueva promoción"
        description="Se aplica sola en la tienda y en la caja mientras esté vigente."
        breadcrumb={{ label: "Promociones", href: "/admin/promociones" }}
      />
      <PromocionForm action={crearPromocion} catalogo={catalogo} />
    </>
  );
}
