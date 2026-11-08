import { PageHeader } from "@/components/admin/ui";
import { GalleryForm } from "../GalleryForm";
import { createGalleryItem } from "../actions";

export const metadata = { title: "Nuevo elemento" };

export default function NewGalleryItemPage() {
  return (
    <>
      <PageHeader
        title="Nuevo elemento"
        breadcrumb={{ label: "Galería", href: "/admin/galeria" }}
      />
      <GalleryForm action={createGalleryItem} submitLabel="Crear elemento" />
    </>
  );
}
