import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/constants";
import { UserForm } from "../UserForm";
import { deleteUser, updateUser } from "../actions";

export const metadata = { title: "Editar usuario" };

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) redirect("/admin");

  const { id } = await params;

  const [user, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { branches: { select: { id: true } } },
    }),
    prisma.branch.findMany({ orderBy: { order: "asc" }, select: { id: true, city: true } }),
  ]);

  if (!user) notFound();

  const isSelf = user.id === currentUser.id;
  const update = updateUser.bind(null, user.id);

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumb={{ label: "Usuarios", href: "/admin/usuarios" }}
      />

      <UserForm
        action={update}
        user={user}
        branchIds={user.branches.map((b) => b.id)}
        branches={branches}
        isSelf={isSelf}
        extra={
          isSelf ? null : (
            <form action={deleteUser} className="ml-auto">
              <input type="hidden" name="id" value={user.id} />
              <DeleteButton
                confirmMessage={`¿Eliminar el usuario "${user.name}"? Perderá el acceso al panel de inmediato.`}
              />
            </form>
          )
        }
      />
    </>
  );
}
