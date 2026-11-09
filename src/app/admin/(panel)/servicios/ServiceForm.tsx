"use client";

import type { Service, ServiceCategory, TeamMember } from "@prisma/client";

import {
  AdminForm,
  CheckboxGroup,
  Field,
  GalleryField,
  ImageField,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

type Profesional = TeamMember & { branch: { city: string } | null };

export function ServiceForm({
  action,
  service,
  categories,
  staff,
  assignedStaffIds = [],
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  service?: Service;
  categories: ServiceCategory[];
  /** Todo el equipo activo (de todas las sedes). */
  staff: Profesional[];
  /** Quiénes ya tienen este servicio asignado (vacío si es nuevo). */
  assignedStaffIds?: string[];
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  // Un servicio de una sede concreta solo lo puede hacer el equipo de esa
  // sede; uno sin sede (global) lo puede hacer cualquiera.
  const staffElegible = service?.branchId
    ? staff.filter((s) => s.branchId === service.branchId)
    : staff;

  const gruposStaff = Object.values(
    staffElegible.reduce<Record<string, { label: string; options: { value: string; label: string }[] }>>(
      (acc, s) => {
        const clave = s.branch?.city ?? "Sin sede";
        (acc[clave] ??= { label: clave, options: [] }).options.push({
          value: s.id,
          label: s.name,
        });
        return acc;
      },
      {},
    ),
  );

  // Un servicio nuevo arranca con todo el equipo elegible marcado — se
  // desmarca a quien no lo haga. Uno existente respeta lo ya guardado.
  const staffMarcadosPorDefecto = service
    ? assignedStaffIds
    : staffElegible.map((s) => s.id);

  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/servicios"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nombre del servicio" name="name" errors={errors} required>
              <Input
                name="name"
                defaultValue={service?.name}
                placeholder="Corte rizo a rizo"
                required
              />
            </Field>

            <Field
              label="Enlace (slug)"
              name="slug"
              errors={errors}
              hint="Se genera solo a partir del nombre si lo dejas vacío."
            >
              <Input
                name="slug"
                defaultValue={service?.slug}
                placeholder="corte-rizo-a-rizo"
              />
            </Field>
          </div>

          <Field
            label="Frase corta"
            name="tagline"
            errors={errors}
            hint="Aparece encima del nombre en la tarjeta."
          >
            <Input
              name="tagline"
              defaultValue={service?.tagline ?? ""}
              placeholder="Respetando la forma de cada rizo"
            />
          </Field>

          <Field
            label="Descripción corta"
            name="description"
            errors={errors}
            required
            hint="Es la que se ve en las tarjetas del sitio."
          >
            <Textarea
              name="description"
              rows={3}
              defaultValue={service?.description}
              required
            />
          </Field>

          <Field
            label="Descripción larga"
            name="longDescription"
            errors={errors}
            hint="Para la página del servicio. Usa ## para subtítulos, - para listas y **negrita**."
          >
            <Textarea
              name="longDescription"
              rows={8}
              defaultValue={service?.longDescription ?? ""}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field
              label="Duración (minutos)"
              name="durationMin"
              errors={errors}
              required
            >
              <Input
                name="durationMin"
                type="number"
                min={5}
                step={5}
                defaultValue={service?.durationMin ?? 60}
                required
              />
            </Field>

            <Field label="Precio (COP)" name="price" errors={errors} required>
              <Input
                name="price"
                type="text"
                inputMode="numeric"
                placeholder="99900"
                defaultValue={service?.price ?? 0}
                required
              />
            </Field>

            <Field label="Categoría" name="categoryId" errors={errors}>
              <Select name="categoryId" defaultValue={service?.categoryId ?? ""}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Comisión propia (%)"
              name="commissionPercent"
              errors={errors}
              hint="Vacío = usa el % de su categoría (en Categorías)."
            >
              <Input
                name="commissionPercent"
                type="number"
                min={0}
                max={100}
                placeholder="Según la categoría"
                defaultValue={service?.commissionPercent ?? ""}
              />
            </Field>
          </div>

          <ImageField
            carpeta="servicios"
            name="imageUrl"
            label="Fotografía del servicio"
            defaultValue={service?.imageUrl}
            errors={errors}
            hint="URL de la imagen. Recomendado 1600 × 1200."
          />

          <GalleryField
            carpeta="servicios"
            name="gallery"
            label="Más fotos del servicio"
            defaultValue={service?.gallery}
            hint="Opcional. Se muestran en la ficha del servicio junto a la fotografía principal (o al dibujo, si no hay foto)."
          />

          <div>
            <p className="mb-1 text-[11px] tracking-[0.12em] text-muted uppercase">
              Profesionales que lo realizan
            </p>
            <p className="t-small mb-3">
              Se usa para asignar profesional automáticamente cuando alguien
              agende. Empiezan todos marcados — desmarca los que no lo hagan.
            </p>
            <CheckboxGroup
              name="staffIds"
              groups={gruposStaff}
              defaultValues={staffMarcadosPorDefecto}
              emptyHint="No hay profesionales activos para asignar todavía."
            />
          </div>

          <Field
            label="Qué incluye"
            name="includes"
            errors={errors}
            hint="Una línea por ítem."
          >
            <Textarea
              name="includes"
              rows={5}
              defaultValue={service?.includes ?? ""}
              placeholder={"Diagnóstico rápido\nCorte en seco rizo a rizo\nSecado con difusor"}
            />
          </Field>

          <Field label="Ideal para" name="idealFor" errors={errors}>
            <Textarea
              name="idealFor"
              rows={2}
              defaultValue={service?.idealFor ?? ""}
              placeholder="Primera visita o inicio de transición."
            />
          </Field>

          <Field
            label="Orden"
            name="order"
            errors={errors}
            hint="Menor número aparece primero."
          >
            <Input
              name="order"
              type="number"
              defaultValue={service?.order ?? 0}
              className="max-w-[160px]"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="active"
              label="Visible en el sitio"
              defaultChecked={service?.active ?? true}
            />
            <Toggle
              name="featured"
              label="Destacado en la portada"
              defaultChecked={service?.featured ?? false}
            />
            <Toggle
              name="priceFrom"
              label='Mostrar "desde" antes del precio'
              defaultChecked={service?.priceFrom ?? true}
            />
            <Toggle
              name="hidePrice"
              label="Ocultar precio en la web"
              hint="En la página pública dice “Precio en valoración”. En el panel y en las ventas el precio sigue igual."
              defaultChecked={service?.hidePrice ?? false}
            />
            <Toggle
              name="bookable"
              label="Reservable en línea por clientes"
              hint="Apágalo en los servicios que requieren abono (color): no salen en la reserva de la web y en su lugar se ofrece WhatsApp. El equipo los sigue agendando desde el panel."
              defaultChecked={service?.bookable ?? false}
            />
          </div>
        </>
      )}
    </AdminForm>
  );
}
