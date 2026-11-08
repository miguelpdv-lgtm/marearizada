import { notFound } from "next/navigation";

import { PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { METODO_PAGO_LABEL, type MetodoPago } from "@/lib/constants";
import { formatCOP, formatDateTime } from "@/lib/format";
import { eliminarVenta } from "../actions";

export const metadata = { title: "Venta" };

export default async function VentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await requireUser();
  const venta = await prisma.sale.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, city: true } },
      staff: { select: { name: true } },
      soldBy: { select: { name: true } },
      items: { include: { staff: { select: { name: true } } } },
      payments: { orderBy: { amount: "desc" } },
      appointment: { select: { code: true } },
    },
  });

  if (!venta) notFound();
  if (sedesPermitidas(user, [venta.branch]).length === 0) notFound();

  const bruto = venta.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
  const descuentos = venta.items.reduce((a, i) => a + i.discount, 0);
  const total = bruto - descuentos;

  return (
    <>
      <PageHeader
        title={venta.code}
        description={`${venta.branch.city} · ${formatDateTime(venta.createdAt)}`}
        breadcrumb={{ label: "Ventas", href: "/admin/ventas" }}
      />

      <div className="max-w-6xl space-y-6">
        <div className="grid gap-4 border border-stone/70 bg-sand/40 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Cliente</p>
            <p className="mt-1 text-sm text-ink">{venta.clientName ?? "Sin registrar"}</p>
            {venta.clientPhone && <p className="t-small">{venta.clientPhone}</p>}
          </div>
          <div>
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Registrada por</p>
            <p className="mt-1 text-sm text-ink">{venta.soldBy?.name ?? "—"}</p>
            {venta.staff && (
              <p className="t-small">Atendió: {venta.staff.name}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Pago</p>
            {venta.payments.length > 1 ? (
              <ul className="mt-1 space-y-0.5 text-sm text-ink">
                {venta.payments.map((p) => (
                  <li key={p.id}>
                    {METODO_PAGO_LABEL[p.method as MetodoPago] ?? p.method} · {formatCOP(p.amount)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink">
                {venta.paymentMethod
                  ? (METODO_PAGO_LABEL[venta.paymentMethod as MetodoPago] ?? venta.paymentMethod)
                  : "Sin especificar"}
              </p>
            )}
          </div>
          {venta.notes && (
            <div className="sm:col-span-2">
              <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Nota</p>
              <p className="mt-1 text-sm text-ink">{venta.notes}</p>
            </div>
          )}
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Ítem</Th>
              <Th>Tipo</Th>
              <Th>Vendió</Th>
              <Th>Cantidad</Th>
              <Th>Precio unitario</Th>
              <Th className="text-right">Subtotal</Th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((i) => (
              <tr key={i.id}>
                <Td className="text-sm text-ink">{i.name}</Td>
                <Td className="text-sm font-normal text-muted">
                  {i.kind === "SERVICE" ? "Servicio" : "Producto"}
                </Td>
                <Td className="text-sm font-normal text-muted">
                  {i.staff?.name ?? venta.staff?.name ?? "—"}
                </Td>
                <Td className="text-sm font-normal text-muted">{i.quantity}</Td>
                <Td className="text-sm font-normal text-muted">{formatCOP(i.unitPrice)}</Td>
                <Td className="text-right text-sm text-ink">
                  {i.discount > 0 ? (
                    <>
                      <span className="text-muted line-through">
                        {formatCOP(i.unitPrice * i.quantity)}
                      </span>{" "}
                      {formatCOP(i.unitPrice * i.quantity - i.discount)}
                    </>
                  ) : (
                    formatCOP(i.unitPrice * i.quantity)
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="text-right text-sm text-ink">
          {descuentos > 0 && (
            <>
              <p className="t-small">Valor de lista {formatCOP(bruto)}</p>
              <p className="t-small text-terra">
                Descuento −{formatCOP(descuentos)} ({Math.round((descuentos / bruto) * 100)}%)
              </p>
            </>
          )}
          <p>
            Pagó: <span className="font-semibold">{formatCOP(total)}</span>
          </p>
        </div>

        {venta.appointment ? (
          <p className="t-small border-t border-stone/70 pt-5">
            Esta venta salió de la cita {venta.appointment.code} al finalizarla. Para corregirla,
            ábrela en la Agenda y usa &quot;Reabrir para corregir&quot;.
          </p>
        ) : (
        <form action={eliminarVenta} className="flex justify-end border-t border-stone/70 pt-5">
          <input type="hidden" name="id" value={venta.id} />
          <DeleteButton
            label="Eliminar venta"
            confirmMessage={`¿Eliminar la venta "${venta.code}"? El stock de los productos vendidos se restaura. Esta acción no se puede deshacer.`}
          />
        </form>
        )}
      </div>
    </>
  );
}
