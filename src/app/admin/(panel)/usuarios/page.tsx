import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ActiveBadge,
  Badge,
  PageHeader,
  Table,
  Td,
  Th,
  Thumb,
} from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL, canManageUsers, type Role } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Usuarios" };

export default async function UsersAdminPage() {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { branches: { select: { city: true } } },
  });

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quiénes pueden entrar al panel y qué puede hacer cada quien."
        action={{ label: "Nuevo usuario", href: "/admin/usuarios/nuevo" }}
      />

      <Table>
        <thead>
          <tr>
            <Th>Usuario</Th>
            <Th>Rol</Th>
            <Th>Local</Th>
            <Th>Último acceso</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-sand/30">
              <Td>
                <div className="flex items-center gap-3">
                  <Thumb src={user.avatarUrl} alt={user.name} fallback="👤" />
                  <div className="min-w-0 max-w-sm">
                    <p className="truncate text-sm text-ink">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-[10px] tracking-[0.12em] text-terra uppercase">
                          Tú
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs font-normal text-muted">
                      {user.email}
                    </p>
                  </div>
                </div>
              </Td>

              <Td>
                <Badge tone={user.role === "ADMIN" ? "gold" : "neutral"}>
                  {ROLE_LABEL[user.role as Role] ?? user.role}
                </Badge>
              </Td>

              <Td className="text-sm font-normal text-muted">
                {user.role === "ADMIN"
                  ? "Ambas"
                  : user.branches.map((b) => b.city).join(", ") || "—"}
              </Td>

              <Td className="text-xs font-normal text-muted">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}
              </Td>

              <Td>
                <ActiveBadge active={user.active} />
              </Td>

              <Td className="text-right">
                <Link
                  href={`/admin/usuarios/${user.id}`}
                  className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-terra"
                >
                  Editar
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
