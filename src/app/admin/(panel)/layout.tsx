import { Suspense } from "react";

import { OkToast } from "@/components/admin/Toast";
import { TopBar, type NavEntry } from "@/components/admin/TopBar";
import { requireUser } from "@/lib/auth";
import { canManageSettings, canManageUsers } from "@/lib/constants";
import { logoutAction } from "@/app/admin/login/actions";
import { prisma } from "@/lib/db";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const branches = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });

  // Agrupado por función de negocio: lo del día a día arriba, el catálogo y
  // el contenido del sitio en sus grupos.
  const nav: NavEntry[] = [
    { type: "link", label: "Hoy", href: "/admin" },
    { type: "link", label: "Agenda", href: "/admin/agenda" },
    { type: "link", label: "Ventas", href: "/admin/ventas" },
    { type: "link", label: "Clientes", href: "/admin/clientes" },
    {
      type: "group",
      title: "Catálogo",
      items: [
        { label: "Servicios", href: "/admin/servicios" },
        { label: "Productos", href: "/admin/productos" },
        { label: "Promociones", href: "/admin/promociones" },
      ],
    },
    {
      type: "group",
      title: "Administración",
      items: [
        { label: "Equipo", href: "/admin/equipo" },
        { label: "Locales", href: "/admin/sucursales" },
        ...(canManageUsers(user.role) ? [{ label: "Usuarios", href: "/admin/usuarios" }] : []),
      ],
    },
    {
      type: "group",
      title: "Contenido",
      items: [
        { label: "Espacios de medios", href: "/admin/medios" },
        { label: "Historias reales", href: "/admin/historias" },
        { label: "Galería", href: "/admin/galeria" },
      ],
    },
    {
      type: "group",
      title: "Reportes",
      items: [
        { label: "Resumen", href: "/admin/reportes" },
        { label: "Comisiones", href: "/admin/reportes/comisiones" },
      ],
    },
    ...(canManageSettings(user.role)
      ? [{ type: "link" as const, label: "Configuración", href: "/admin/configuracion" }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <OkToast />
      </Suspense>
      <TopBar nav={nav} user={user} branches={branches} logout={logoutAction} />
      <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-[100rem]">{children}</div>
      </div>
    </div>
  );
}
