import { notFound } from "next/navigation";

import { CardHeader, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { formatDate } from "@/lib/format";
import { ProductForm } from "../ProductForm";
import { deleteProduct, updateProduct } from "../actions";
import { AjusteStockForm } from "./AjusteStockForm";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const [product, categories, todasLasSedes, stockPorSede, movimientosSinFiltrar] =
    await Promise.all([
      prisma.product.findUnique({ where: { id } }),
      prisma.productCategory.findMany({ orderBy: { order: "asc" } }),
      prisma.branch.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        select: { id: true, city: true },
      }),
      prisma.productStock.findMany({ where: { productId: id } }),
      prisma.stockMovement.findMany({
        where: { productId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { branch: { select: { city: true } }, staff: { select: { name: true } } },
      }),
    ]);

  if (!product) notFound();

  const branches = sedesPermitidas(user, todasLasSedes);
  const branchIds = new Set(branches.map((b) => b.id));
  const movimientos = movimientosSinFiltrar.filter((m) => branchIds.has(m.branchId));

  const update = updateProduct.bind(null, product.id);
  const stockDeSede = new Map(stockPorSede.map((s) => [s.branchId, s.stock]));

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.brand ?? undefined}
        breadcrumb={{ label: "Productos", href: "/admin/productos" }}
      />

      <ProductForm
        action={update}
        product={product}
        categories={categories}
        branches={branches}
        extra={
          <form action={deleteProduct} className="ml-auto">
            <input type="hidden" name="id" value={product.id} />
            <DeleteButton
              confirmMessage={`¿Eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`}
            />
          </form>
        }
      />

      <div className="mt-12 max-w-6xl">
        <CardHeader
          title="Stock por local"
          description="Cada ajuste queda registrado abajo, con causa y responsable."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {branches.map((b) => (
            <AjusteStockForm
              key={b.id}
              productId={product.id}
              branchId={b.id}
              city={b.city}
              stockActual={stockDeSede.get(b.id) ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 max-w-6xl">
        <CardHeader title="Movimiento de stock" />
        <div className="mt-4">
          {movimientos.length === 0 ? (
            <p className="t-small">Todavía no hay movimientos registrados.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Local</Th>
                  <Th>Ajuste</Th>
                  <Th>Causa</Th>
                  <Th>Responsable</Th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <Td className="text-sm font-normal text-muted">{formatDate(m.createdAt)}</Td>
                    <Td className="text-sm font-normal text-muted">{m.branch.city}</Td>
                    <Td className="text-sm text-ink">
                      {m.before} → {m.after}
                    </Td>
                    <Td className="text-sm font-normal text-muted">
                      {m.cause}
                      {m.comment && <span className="block text-xs">{m.comment}</span>}
                    </Td>
                    <Td className="text-sm font-normal text-muted">{m.staff?.name ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
