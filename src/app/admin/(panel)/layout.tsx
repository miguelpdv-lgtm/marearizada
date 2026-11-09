import { Suspense } from "react";

import { OkToast } from "@/components/admin/Toast";
import { PanelShell, type GrupoNav } from "@/components/admin/PanelShell";
import { requireUser } from "@/lib/auth";
import { canManageSettings, canManageUsers } from "@/lib/constants";
import { logoutAction } from "@/app/admin/login/actions";

/**
 * Estructura del panel de Marea Rizada: un solo local, dos agendas (Salón y
 * Nails). La navegación va por áreas del día a día; en el celular, Hoy,
 * Agenda, Ventas y Clientes quedan como pestañas abajo.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const grupos: GrupoNav[] = [
    {
      titulo: null,
      items: [
        { label: "Hoy", href: "/admin", icono: "hoy" },
        { label: "Agenda", href: "/admin/agenda", icono: "agenda" },
        { label: "Ventas", href: "/admin/ventas", icono: "ventas" },
        { label: "Clientes", href: "/admin/clientes", icono: "clientes" },
      ],
    },
    {
      titulo: "Catálogo",
      items: [
        { label: "Servicios", href: "/admin/servicios", icono: "servicios" },
        { label: "Productos", href: "/admin/productos", icono: "productos" },
        { label: "Promociones y cupones", href: "/admin/promociones", icono: "promociones" },
      ],
    },
    {
      titulo: "Equipo y local",
      items: [
        { label: "Equipo", href: "/admin/equipo", icono: "equipo" },
        { label: "Local", href: "/admin/sucursales", icono: "local" },
        ...(canManageUsers(user.role)
          ? [{ label: "Usuarios", href: "/admin/usuarios", icono: "usuarios" as const }]
          : []),
      ],
    },
    {
      titulo: "Números",
      items: [
        { label: "Reportes", href: "/admin/reportes", icono: "reportes" },
        { label: "Comisiones", href: "/admin/reportes/comisiones", icono: "comisiones" },
      ],
    },
    {
      titulo: "Sitio",
      items: [
        { label: "Reseñas e historias", href: "/admin/historias", icono: "resenas" },
        { label: "Galería", href: "/admin/galeria", icono: "galeria" },
        { label: "Fotos y videos del sitio", href: "/admin/medios", icono: "medios" },
        ...(canManageSettings(user.role)
          ? [{ label: "Configuración", href: "/admin/configuracion", icono: "configuracion" as const }]
          : []),
      ],
    },
  ];

  return (
    <PanelShell grupos={grupos} user={user} logout={logoutAction}>
      <Suspense fallback={null}>
        <OkToast />
      </Suspense>
      {children}
    </PanelShell>
  );
}
