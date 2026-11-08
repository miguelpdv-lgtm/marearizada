import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { GalleryForm } from "../GalleryForm";
import { deleteGalleryItem, updateGalleryItem } from "../actions";

export const metadata = { title: "Editar elemento" };

export default async function EditGalleryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.galleryItem.findUnique({ where: { id } });

  if (!item) notFound();

  const update = updateGalleryItem.bind(null, item.id);

  return (
    <>
      <PageHeader
        title={item.caption || "Elemento de galería"}
        description={item.kind === "REEL" ? "Reel" : "Fotografía"}
        breadcrumb={{ label: "Galería", href: "/admin/galeria" }}
      />

      <GalleryForm
        action={update}
        item={item}
        extra={
          <form action={deleteGalleryItem} className="ml-auto">
            <input type="hidden" name="id" value={item.id} />
            <DeleteButton confirmMessage="¿Eliminar este elemento de la galería?" />
          </form>
        }
      />
    </>
  );
}
