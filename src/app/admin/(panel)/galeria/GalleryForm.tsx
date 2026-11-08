"use client";

import type { GalleryItem } from "@prisma/client";

import {
  AdminForm,
  Field,
  ImageField,
  Input,
  Select,
  Toggle,
} from "@/components/admin/form";
import { GALLERY_SIZES, GALLERY_SIZE_LABEL } from "@/lib/constants";
import type { ActionState } from "@/lib/actions";

export function GalleryForm({
  action,
  item,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  item?: GalleryItem;
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/galeria"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Tipo" name="kind" errors={errors}>
              <Select name="kind" defaultValue={item?.kind ?? "IMAGE"}>
                <option value="IMAGE">📷 Fotografía</option>
                <option value="REEL">🎥 Reel</option>
              </Select>
            </Field>

            <Field
              label="Proporción"
              name="size"
              errors={errors}
              hint="Define cómo se acomoda en el mosaico."
            >
              <Select name="size" defaultValue={item?.size ?? "NORMAL"}>
                {GALLERY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {GALLERY_SIZE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Orden" name="order" errors={errors}>
              <Input name="order" type="number" defaultValue={item?.order ?? 0} />
            </Field>
          </div>

          <ImageField
            carpeta="galeria"
            name="imageUrl"
            label="Imagen"
            defaultValue={item?.imageUrl}
            errors={errors}
            hint="Para los reels puedes usarla como portada."
            aspect="1/1"
          />

          <Field
            label="Video del reel"
            name="videoUrl"
            errors={errors}
            hint="URL del MP4. Solo si el tipo es Reel."
          >
            <Input name="videoUrl" defaultValue={item?.videoUrl ?? ""} />
          </Field>

          <Field label="Descripción" name="caption" errors={errors}>
            <Input name="caption" defaultValue={item?.caption ?? ""} />
          </Field>

          <Field
            label="Enlace a Instagram"
            name="externalUrl"
            errors={errors}
            hint="Si lo llenas, al hacer clic se abre la publicación original."
          >
            <Input name="externalUrl" defaultValue={item?.externalUrl ?? ""} />
          </Field>

          <Toggle
            name="active"
            label="Visible en el sitio"
            defaultChecked={item?.active ?? true}
          />
        </>
      )}
    </AdminForm>
  );
}
