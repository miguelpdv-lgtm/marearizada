"use client";

import { useState } from "react";
import type { Promotion } from "@prisma/client";

import {
  AdminForm,
  DeleteButton,
  Field,
  Input,
  Select,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";
import { ALCANCES, CANALES, TIPOS_PROMOCION } from "@/lib/promociones";

import { eliminarPromocion } from "./actions";

export type Opcion = { id: string; label: string };

export type Catalogo = {
  productos: Opcion[];
  servicios: Opcion[];
  categoriasProducto: Opcion[];
  categoriasServicio: Opcion[];
};

/** Date → "2026-09-21", que es lo que espera un <input type="date">. */
function aInput(valor: Date | null | undefined) {
  if (!valor) return "";
  // Se pasa a hora de Colombia antes de cortar: una promoción guardada a las
  // 23:59 del 30 es, en UTC, las 04:59 del 1 — y el input mostraría el día
  // siguiente.
  return new Date(valor.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

export function PromocionForm({
  action,
  promocion,
  catalogo,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  promocion?: Promotion;
  catalogo: Catalogo;
}) {
  // El alcance decide qué selector de destino se muestra, así que vive en
  // estado y no solo en el DOM.
  const [scope, setScope] = useState(promocion?.scope ?? "TODO");
  const [kind, setKind] = useState(promocion?.kind ?? "PORCENTAJE");

  const destinos: Record<string, { name: string; label: string; opciones: Opcion[] }> = {
    PRODUCTO: { name: "productId", label: "Producto", opciones: catalogo.productos },
    SERVICIO: { name: "serviceId", label: "Servicio", opciones: catalogo.servicios },
    CATEGORIA_PRODUCTO: {
      name: "productCategoryId",
      label: "Categoría de productos",
      opciones: catalogo.categoriasProducto,
    },
    CATEGORIA_SERVICIO: {
      name: "serviceCategoryId",
      label: "Categoría de servicios",
      opciones: catalogo.categoriasServicio,
    },
  };

  const destino = destinos[scope];
  const valorActual = promocion
    ? ((promocion[destino?.name as keyof Promotion] as string | null) ?? "")
    : "";

  return (
    <AdminForm
      action={action}
      submitLabel={promocion ? "Guardar cambios" : "Crear promoción"}
      cancelHref="/admin/promociones"
      extra={
        promocion && (
          <form action={eliminarPromocion}>
            <input type="hidden" name="id" value={promocion.id} />
            <DeleteButton
              label="Eliminar promoción"
              confirmMessage="¿Eliminar esta promoción? Las ventas que ya se hicieron con ella no cambian."
            />
          </form>
        )
      }
    >
      {(errors) => (
        <>
          <div className="admin-card space-y-6">
            <Field
              label="Nombre"
              name="name"
              errors={errors}
              required
              hint="Solo lo ve el equipo. Sirve para reconocerla en el listado."
            >
              <Input
                name="name"
                defaultValue={promocion?.name}
                placeholder="Ej.: Día de la madre · 20% en hidrataciones"
                required
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Tipo de descuento" name="kind" errors={errors}>
                <Select
                  name="kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {Object.entries(TIPOS_PROMOCION).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={kind === "PORCENTAJE" ? "Porcentaje" : "Pesos a rebajar"}
                name="value"
                errors={errors}
                required
                hint={
                  kind === "PORCENTAJE"
                    ? "De 1 a 100. Se aplica sobre el precio de lista."
                    : "Se rebaja del precio unitario, no del total del carrito."
                }
              >
                <Input
                  name="value"
                  type="number"
                  min={1}
                  max={kind === "PORCENTAJE" ? 100 : undefined}
                  defaultValue={promocion?.value ?? ""}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="admin-card space-y-6">
            <Field
              label="A qué aplica"
              name="scope"
              errors={errors}
              hint="Cada promoción apunta a una sola cosa. Para cubrir varias, crea varias."
            >
              <Select
                name="scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                {Object.entries(ALCANCES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>

            {destino && (
              <Field label={destino.label} name={destino.name} errors={errors} required>
                <Select name={destino.name} defaultValue={valorActual} required>
                  <option value="">Elige uno…</option>
                  {destino.opciones.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label="Dónde vale"
              name="channel"
              errors={errors}
              hint="Una promoción de la web no tiene por qué aplicarse sola en caja."
            >
              <Select name="channel" defaultValue={promocion?.channel ?? "AMBOS"}>
                {Object.entries(CANALES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="admin-card space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label="Desde"
                name="startsAt"
                errors={errors}
                hint="Vacío = empieza ya."
              >
                <Input
                  name="startsAt"
                  type="date"
                  defaultValue={aInput(promocion?.startsAt)}
                />
              </Field>

              <Field
                label="Hasta"
                name="endsAt"
                errors={errors}
                hint="Vacío = no vence. Vale todo el día que elijas."
              >
                <Input
                  name="endsAt"
                  type="date"
                  defaultValue={aInput(promocion?.endsAt)}
                />
              </Field>
            </div>

            <Toggle
              name="active"
              label="Promoción activa"
              hint="Apagada no se aplica en ningún lado, aunque esté dentro de sus fechas."
              defaultChecked={promocion?.active ?? true}
            />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Cuando dos promociones cubren el mismo ítem gana la que más rebaja,
            nunca se suman. El precio siempre se recalcula en el servidor: lo que
            se muestre en el sitio es informativo, lo que se cobra sale de acá.
          </p>
        </>
      )}
    </AdminForm>
  );
}
