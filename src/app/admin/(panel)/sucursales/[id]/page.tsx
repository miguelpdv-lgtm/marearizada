import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { BranchForm } from "../BranchForm";
import { deleteBranch, updateBranch } from "../actions";

export const metadata = { title: "Editar local" };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branch = await prisma.branch.findUnique({ where: { id } });

  if (!branch) notFound();

  const update = updateBranch.bind(null, branch.id);

  return (
    <>
      <PageHeader
        title={branch.name}
        description={branch.address}
        breadcrumb={{ label: "Locales", href: "/admin/sucursales" }}
      />

      <BranchForm
        action={update}
        branch={branch}
        extra={
          <form action={deleteBranch} className="ml-auto">
            <input type="hidden" name="id" value={branch.id} />
            <DeleteButton
              confirmMessage={`¿Eliminar el local de ${branch.city}? El equipo asociado quedará sin local, pero no se borra.`}
            />
          </form>
        }
      />
    </>
  );
}
