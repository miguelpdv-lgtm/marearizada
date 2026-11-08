"use client";

import { AdminForm, Field, Input, Textarea } from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

/** Formulario compartido por las categorías de servicios y de productos. */
export function CategoryForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  return (
    <AdminForm action={action} submitLabel="Crear categoría">
      {(errors) => (
        <>
          <Field label="Nombre" name="name" errors={errors} required>
            <Input name="name" placeholder="Tratamientos" required />
          </Field>

          <Field
            label="Descripción"
            name="description"
            errors={errors}
            hint="Aparece debajo del título de la categoría."
          >
            <Textarea name="description" rows={3} />
          </Field>

          <Field label="Orden" name="order" errors={errors}>
            <Input
              name="order"
              type="number"
              defaultValue={0}
              className="max-w-[140px]"
            />
          </Field>
        </>
      )}
    </AdminForm>
  );
}
