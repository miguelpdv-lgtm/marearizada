"use client";

import { useActionState } from "react";

import { FormAlert, SubmitButton } from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";
import { CAUSAS_AJUSTE } from "@/lib/constants";
import { ajustarStock } from "../actions";

/** Ajuste puntual del stock de un producto en una sede: deja rastro en
 * `StockMovement` (causa, responsable) en vez de solo sobrescribir un
 * número, igual que "Movimiento de stock" en AgendaPro. */
export function AjusteStockForm({
  productId,
  branchId,
  city,
  stockActual,
}: {
  productId: string;
  branchId: string;
  city: string;
  stockActual: number;
}) {
  const [state, formAction] = useActionState(ajustarStock, {} as ActionState);

  return (
    <form action={formAction} className="border border-stone bg-white p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="branchId" value={branchId} />

      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm text-ink">{city}</p>
        <p className="display text-2xl text-ink">{stockActual}</p>
      </div>

      <FormAlert state={state} />

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <input
          type="number"
          name="stock"
          min={0}
          defaultValue={stockActual}
          required
          className="admin-control px-4 py-3 text-base"
        />
        <select
          name="cause"
          className="admin-control px-4 py-3 text-base"
        >
          {CAUSAS_AJUSTE.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        name="comment"
        placeholder="Comentario (opcional)"
        className="mt-2 w-full rounded-lg border border-stone bg-white px-3 py-2 text-sm text-ink placeholder:text-clay focus:border-marea focus:outline-none"
      />

      <div className="mt-3">
        <SubmitButton className="w-full text-xs">Ajustar stock</SubmitButton>
      </div>
    </form>
  );
}
