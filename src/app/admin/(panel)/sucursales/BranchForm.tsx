"use client";

import type { Branch } from "@prisma/client";

import {
  AdminForm,
  Field,
  ImageField,
  Input,
  Textarea,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

export function BranchForm({
  action,
  branch,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  branch?: Branch;
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/sucursales"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Nombre" name="name" errors={errors} required>
              <Input
                name="name"
                defaultValue={branch?.name}
                placeholder="Amicrespa Barranquilla"
                required
              />
            </Field>

            <Field label="Ciudad" name="city" errors={errors} required>
              <Input name="city" defaultValue={branch?.city} required />
            </Field>

            <Field label="Enlace (slug)" name="slug" errors={errors}>
              <Input name="slug" defaultValue={branch?.slug} />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Dirección" name="address" errors={errors} required>
              <Input name="address" defaultValue={branch?.address} required />
            </Field>

            <Field label="Barrio o sector" name="neighborhood" errors={errors}>
              <Input
                name="neighborhood"
                defaultValue={branch?.neighborhood ?? ""}
                placeholder="Alto Prado"
              />
            </Field>
          </div>

          <Field label="Descripción" name="description" errors={errors}>
            <Textarea
              name="description"
              rows={3}
              defaultValue={branch?.description ?? ""}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Teléfono" name="phone" errors={errors}>
              <Input name="phone" defaultValue={branch?.phone ?? ""} />
            </Field>

            <Field
              label="WhatsApp"
              name="whatsapp"
              errors={errors}
              hint="Solo números."
            >
              <Input name="whatsapp" defaultValue={branch?.whatsapp ?? ""} />
            </Field>

            <Field label="Correo" name="email" errors={errors}>
              <Input name="email" type="email" defaultValue={branch?.email ?? ""} />
            </Field>
          </div>

          <Field
            label="Horarios"
            name="hours"
            errors={errors}
            hint="Una línea por rango. Se muestra tal cual en el sitio."
          >
            <Textarea
              name="hours"
              rows={4}
              defaultValue={branch?.hours ?? ""}
              placeholder={
                "Lunes a viernes · 9:00 a.m. – 7:00 p.m.\nSábados · 8:00 a.m. – 6:00 p.m.\nDomingos y festivos · Cerrado"
              }
            />
          </Field>

          <Field
            label="Cierre temporal"
            name="closedNotice"
            errors={errors}
            hint="Déjalo vacío si la sede está abierta. Con texto, la sede se sigue viendo en el sitio con este aviso, pero no recibe reservas ni despacha pedidos."
          >
            <Textarea
              name="closedNotice"
              rows={2}
              defaultValue={branch?.closedNotice ?? ""}
              placeholder="Nuestra sede está cerrada temporalmente mientras hacemos reparaciones. Te avisaremos aquí apenas volvamos a abrir."
            />
          </Field>

          <Field
            label="Enlace de Google Maps"
            name="mapsUrl"
            errors={errors}
            hint="Alimenta el botón “Cómo llegar”."
          >
            <Input name="mapsUrl" defaultValue={branch?.mapsUrl ?? ""} />
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field
              label="Coordenadas"
              name="coordenadas"
              errors={errors}
              hint="En Google Maps, clic derecho sobre el pin del local y clic en los números: se copian. Pégalos aquí."
            >
              <Input
                name="coordenadas"
                defaultValue={
                  branch?.latitude != null && branch?.longitude != null
                    ? `${branch.latitude}, ${branch.longitude}`
                    : ""
                }
                placeholder="10.99823, -74.81052"
              />
            </Field>

            <Field label="Departamento" name="region" errors={errors}>
              <Input
                name="region"
                defaultValue={branch?.region ?? ""}
                placeholder="Atlántico"
              />
            </Field>

            <Field label="Código postal" name="postalCode" errors={errors}>
              <Input
                name="postalCode"
                defaultValue={branch?.postalCode ?? ""}
                placeholder="080020"
              />
            </Field>
          </div>

          <Field
            label="Enlace para dejar reseña en Google"
            name="googleReviewUrl"
            errors={errors}
            hint="En Google Business: “Pedir reseñas” → copiar enlace. Sale en la página de la sede y en el correo de “Gracias por tu visita”."
          >
            <Input
              name="googleReviewUrl"
              defaultValue={branch?.googleReviewUrl ?? ""}
              placeholder="https://g.page/r/..."
            />
          </Field>

          <ImageField
            carpeta="sucursales"
            name="imageUrl"
            label="Fotografía del local"
            defaultValue={branch?.imageUrl}
            errors={errors}
            hint="Recomendado 1600 × 1000."
            aspect="16/10"
          />

          <Field label="Orden" name="order" errors={errors}>
            <Input
              name="order"
              type="number"
              defaultValue={branch?.order ?? 0}
              className="max-w-[160px]"
            />
          </Field>

          <Toggle
            name="active"
            label="Visible en el sitio"
            defaultChecked={branch?.active ?? true}
          />
        </>
      )}
    </AdminForm>
  );
}
