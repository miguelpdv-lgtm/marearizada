"use client";

import type { Product, ProductCategory } from "@prisma/client";

import {
  AdminForm,
  Field,
  GalleryField,
  ImageField,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

export function ProductForm({
  action,
  product,
  categories,
  branches,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  product?: Product;
  categories: ProductCategory[];
  /** Sedes activas — para el stock inicial al crear. En edición, el stock se
   * ajusta desde el panel "Stock por sede" debajo del formulario. */
  branches: { id: string; city: string }[];
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/productos"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nombre del producto" name="name" errors={errors} required>
              <Input
                name="name"
                defaultValue={product?.name}
                placeholder="Gel de definición"
                required
              />
            </Field>

            <Field
              label="Enlace (slug)"
              name="slug"
              errors={errors}
              hint="Se genera solo si lo dejas vacío."
            >
              <Input name="slug" defaultValue={product?.slug} />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Marca" name="brand" errors={errors}>
              <Input name="brand" defaultValue={product?.brand ?? ""} />
            </Field>

            <Field label="Presentación" name="size" errors={errors}>
              <Input
                name="size"
                defaultValue={product?.size ?? ""}
                placeholder="300 ml"
              />
            </Field>

            <Field label="Categoría" name="categoryId" errors={errors}>
              <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descripción" name="description" errors={errors} required>
            <Textarea
              name="description"
              rows={3}
              defaultValue={product?.description}
              required
            />
          </Field>

          <Field
            label="Descripción larga"
            name="longDescription"
            errors={errors}
            hint="Modo de uso, ingredientes o recomendaciones."
          >
            <Textarea
              name="longDescription"
              rows={6}
              defaultValue={product?.longDescription ?? ""}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-4">
            <Field label="Precio (COP)" name="price" errors={errors} required>
              <Input
                name="price"
                type="text"
                inputMode="numeric"
                placeholder="99900"
                defaultValue={product?.price ?? 0}
                required
              />
            </Field>

            <Field
              label="Precio tachado"
              name="compareAtPrice"
              errors={errors}
              hint="Opcional."
            >
              <Input
                name="compareAtPrice"
                type="text"
                inputMode="numeric"
                placeholder="99900"
                defaultValue={product?.compareAtPrice ?? ""}
              />
            </Field>

            <Field label="SKU" name="sku" errors={errors}>
              <Input name="sku" defaultValue={product?.sku ?? ""} />
            </Field>

          </div>

          {product ? (
            <p className="t-small">
              Inventario total: <span className="text-ink">{product.stock}</span> — se ajusta por
              local en el panel de abajo, no aquí.
            </p>
          ) : (
            <div className={`grid gap-6 ${branches.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {branches.map((b) => (
                <Field key={b.id} label={`Stock inicial en ${b.city}`} name={`stock_${b.id}`}>
                  <Input name={`stock_${b.id}`} type="number" min={0} defaultValue={0} />
                </Field>
              ))}
            </div>
          )}

          <ImageField
            carpeta="productos"
            name="imageUrl"
            label="Fotografía del producto"
            defaultValue={product?.imageUrl}
            errors={errors}
            hint="Recomendado 1000 × 1000, fondo claro."
            aspect="1/1"
          />

          <GalleryField
            carpeta="productos"
            name="gallery"
            label="Más fotos del producto"
            defaultValue={product?.gallery}
            hint="Opcional. Se muestran en la ficha del producto después de la fotografía principal."
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Tipos de cabello"
              name="hairTypes"
              errors={errors}
              hint="Separados por coma."
            >
              <Input
                name="hairTypes"
                defaultValue={product?.hairTypes ?? ""}
                placeholder="Ondulado, Rizado, Crespo"
              />
            </Field>

            <Field label="Orden" name="order" errors={errors}>
              <Input name="order" type="number" defaultValue={product?.order ?? 0} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="active"
              label="Visible en el sitio"
              defaultChecked={product?.active ?? true}
            />
            <Toggle
              name="featured"
              label="Destacado"
              defaultChecked={product?.featured ?? false}
            />
            <Toggle
              name="purchasable"
              label="Comprable en línea"
              hint="Se activa con la tienda de la Fase 2."
              defaultChecked={product?.purchasable ?? false}
              disabled
            />
          </div>

          <input
            type="hidden"
            name="purchasable"
            value={product?.purchasable ? "true" : "false"}
          />
        </>
      )}
    </AdminForm>
  );
}
