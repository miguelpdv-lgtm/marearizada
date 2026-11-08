import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { TestimonialForm } from "../TestimonialForm";
import { deleteTestimonial, updateTestimonial } from "../actions";

export const metadata = { title: "Editar historia" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });

  if (!testimonial) notFound();

  const update = updateTestimonial.bind(null, testimonial.id);

  return (
    <>
      <PageHeader
        title={testimonial.clientName}
        description={testimonial.city ?? undefined}
        breadcrumb={{ label: "Historias reales", href: "/admin/historias" }}
      />

      <TestimonialForm
        action={update}
        testimonial={testimonial}
        extra={
          <form action={deleteTestimonial} className="ml-auto">
            <input type="hidden" name="id" value={testimonial.id} />
            <DeleteButton
              confirmMessage={`¿Eliminar la historia de ${testimonial.clientName}?`}
            />
          </form>
        }
      />
    </>
  );
}
