import Link from "next/link";
import { Suspense } from "react";

import {
  ActiveBadge,
  Badge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Thumb,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { formatCOP } from "@/lib/format";
import { BuscadorLista } from "@/components/admin/BuscadorLista";

/** Sin tildes ni mayúsculas: "hidratacion" encuentra "Hidratación". */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const metadata = { title: "Productos" };

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });
  const permitidas = sedesPermitidas(user, todasLasSedes);
  const sedeId = sedeEfectiva(permitidas, sp.sede);
  const branchIds = sedeId ? [sedeId] : permitidas.map((s) => s.id);

  const todos = await prisma.product.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      category: true,
      stockByBranch: { where: { branchId: { in: branchIds } } },
    },
  });

  // Se filtra acá y no en la consulta para ignorar tildes: el catálogo es de
  // unos cientos de productos, así que traerlo entero no pesa.
  const q = normalizar(sp.q ?? "");
  const products = q
    ? todos.filter((p) =>
        [p.name, p.brand, p.sku, p.slug, p.category?.name]
          .filter(Boolean)
          .some((campo) => normalizar(String(campo)).includes(q)),
      )
    : todos;

  /** Un usuario con solo alguna(s) sede(s) ve el stock de esas, no el
   * total cacheado de `Product.stock` (que suma todas). */
  const stockVisible = (p: (typeof products)[number]) =>
    p.stockByBranch.reduce((a, s) => a + s.stock, 0);

  return (
    <>
      <PageHeader
        title="Productos"
        description="El catálogo de productos y accesorios. La venta en línea se habilita en la Fase 2."
        action={{ label: "Nuevo producto", href: "/admin/productos/nuevo" }}
      />

      <div className="mb-6">
        <Link
          href="/admin/productos/categorias"
          className="text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:text-marea"
        >
          Gestionar categorías →
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Suspense>
          <BuscadorLista placeholder="Buscar por nombre, marca o SKU" />
        </Suspense>
        {q && (
          <p className="text-sm text-muted">
            {products.length} de {todos.length} productos
          </p>
        )}
      </div>

      {q && products.length === 0 ? (
        <EmptyState title="Ningún producto coincide con la búsqueda" description="Prueba con otra palabra o con la marca." />
      ) : products.length === 0 ? (
        <EmptyState
          title="Todavía no hay productos"
          action={{ label: "Nuevo producto", href: "/admin/productos/nuevo" }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th>Precio</Th>
              <Th>Inventario</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-[#effbfb]">
                <Td>
                  <div className="flex items-center gap-3">
                    <Thumb src={product.imageUrl} alt={product.name} />
                    <div className="min-w-0 max-w-sm">
                      <p className="truncate text-sm text-ink">{product.name}</p>
                      <p className="truncate text-xs font-normal text-muted">
                        {[product.brand, product.size].filter(Boolean).join(" · ") ||
                          `/${product.slug}`}
                      </p>
                    </div>
                  </div>
                </Td>

                <Td className="text-sm font-normal text-muted">
                  {product.category?.name ?? "—"}
                </Td>

                <Td className="text-sm text-ink">{formatCOP(product.price)}</Td>

                <Td>
                  <span
                    className={`text-sm ${
                      stockVisible(product) === 0
                        ? "text-red-600"
                        : stockVisible(product) < 5
                          ? "text-amber-600"
                          : "text-muted"
                    }`}
                  >
                    {stockVisible(product)}
                  </span>
                </Td>

                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <ActiveBadge active={product.active} />
                    {product.featured && <Badge tone="gold">Destacado</Badge>}
                  </div>
                </Td>

                <Td className="text-right">
                  <Link
                    href={`/admin/productos/${product.id}`}
                    className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-marea"
                  >
                    Editar
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
