"use client";

import type { Testimonial } from "@prisma/client";

import {
  AdminForm,
  Field,
  ImageField,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

export function TestimonialForm({
  action,
  testimonial,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  testimonial?: Testimonial;
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/historias"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="border border-gold-300/60 bg-gold-50/60 px-5 py-4">
            <p className="text-xs leading-relaxed font-normal text-terra-deep">
              Publica solo testimonios reales y con autorización de la clienta.
              Basta el nombre de pila si prefiere no aparecer completa.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Nombre de la clienta" name="clientName" errors={errors} required>
              <Input
                name="clientName"
                defaultValue={testimonial?.clientName}
                required
              />
            </Field>

            <Field label="Ciudad" name="city" errors={errors}>
              <Input
                name="city"
                defaultValue={testimonial?.city ?? ""}
                placeholder="Barranquilla"
              />
            </Field>

            <Field label="Servicio" name="serviceName" errors={errors}>
              <Input
                name="serviceName"
                defaultValue={testimonial?.serviceName ?? ""}
                placeholder="Corte rizo a rizo"
              />
            </Field>
          </div>

          <Field
            label="Cita"
            name="quote"
            errors={errors}
            required
            hint="Sus palabras textuales. Es lo que se muestra en grande."
          >
            <Textarea
              name="quote"
              rows={3}
              defaultValue={testimonial?.quote}
              required
            />
          </Field>

          <Field
            label="Contexto"
            name="story"
            errors={errors}
            hint="Una línea que sitúa su historia. Opcional."
          >
            <Textarea name="story" rows={2} defaultValue={testimonial?.story ?? ""} />
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Calificación" name="rating" errors={errors}>
              <Select name="rating" defaultValue={String(testimonial?.rating ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} ({n})
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Video del testimonio"
              name="videoUrl"
              errors={errors}
              hint="URL del archivo MP4."
            >
              <Input name="videoUrl" defaultValue={testimonial?.videoUrl ?? ""} />
            </Field>

            <Field label="Orden" name="order" errors={errors}>
              <Input
                name="order"
                type="number"
                defaultValue={testimonial?.order ?? 0}
              />
            </Field>
          </div>

          <ImageField
            carpeta="historias"
            name="avatarUrl"
            label="Foto de la clienta"
            defaultValue={testimonial?.avatarUrl}
            errors={errors}
            aspect="1/1"
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <ImageField
            carpeta="historias"
              name="beforeImageUrl"
              label="Antes"
              defaultValue={testimonial?.beforeImageUrl}
              errors={errors}
              hint="Mismo encuadre que el después."
              aspect="3/4"
            />
            <ImageField
            carpeta="historias"
              name="afterImageUrl"
              label="Después"
              defaultValue={testimonial?.afterImageUrl}
              errors={errors}
              aspect="3/4"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="active"
              label="Visible en el sitio"
              defaultChecked={testimonial?.active ?? true}
            />
            <Toggle
              name="featured"
              label="Destacada"
              hint="Aparece primero en el carrusel."
              defaultChecked={testimonial?.featured ?? false}
            />
          </div>
        </>
      )}
    </AdminForm>
  );
}
