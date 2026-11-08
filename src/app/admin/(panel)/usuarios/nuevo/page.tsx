import { redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/constants";
import { UserForm } from "../UserForm";
import { createUser } from "../actions";

export const metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) redirect("/admin");

  const branches = await prisma.branch.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <PageHeader
        title="Nuevo usuario"
        description="Crea el acceso al panel para alguien del equipo."
        breadcrumb={{ label: "Usuarios", href: "/admin/usuarios" }}
      />
      <UserForm
        action={createUser}
        branches={branches}
        submitLabel="Crear usuario"
      />
    </>
  );
}
