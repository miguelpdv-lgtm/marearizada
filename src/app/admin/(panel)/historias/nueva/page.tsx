import { PageHeader } from "@/components/admin/ui";
import { TestimonialForm } from "../TestimonialForm";
import { createTestimonial } from "../actions";

export const metadata = { title: "Nueva historia" };

export default function NewTestimonialPage() {
  return (
    <>
      <PageHeader
        title="Nueva historia"
        breadcrumb={{ label: "Reseñas e historias", href: "/admin/historias" }}
      />
      <TestimonialForm action={createTestimonial} submitLabel="Crear historia" />
    </>
  );
}
