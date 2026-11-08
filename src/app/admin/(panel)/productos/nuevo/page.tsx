import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedesPermitidas } from "@/lib/branchAccess";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const user = await requireUser();
  const [categories, todasLasSedes] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.branch.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, city: true },
    }),
  ]);
  const branches = sedesPermitidas(user, todasLasSedes);

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        breadcrumb={{ label: "Productos", href: "/admin/productos" }}
      />
      <ProductForm
        action={createProduct}
        categories={categories}
        branches={branches}
        submitLabel="Crear producto"
      />
    </>
  );
}
