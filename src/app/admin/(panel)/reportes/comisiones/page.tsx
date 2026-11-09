import Link from "next/link";

import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { PeriodoSwitcher } from "@/components/admin/PeriodoSwitcher";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { hoyBogota } from "@/lib/agenda";
import { esPeriodo, etiquetaPeriodo, moverPeriodo, rangoPeriodo, type Periodo } from "@/lib/reportPeriod";
import { formatCOP } from "@/lib/format";
import { comisionesReporte } from "../queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comisiones" };

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; fecha?: string; sede?: string }>;
}) {
  const sp = await searchParams;
  const hoy = hoyBogota();

  const periodo: Periodo = esPeriodo(sp.periodo) ? sp.periodo : "mes";
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const { desde, hasta } = rangoPeriodo(periodo, fecha);

  const user = await requireUser();
  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, city: true },
  });
  const sedes = sedesPermitidas(user, todasLasSedes);
  const sedeId = sedeEfectiva(sedes, sp.sede);

  if (sedes.length === 0) {
    return (
      <PageHeader
        title="Comisiones"
        description="No tienes ninguna sede asignada — pídele a un administrador que te asigne una en Usuarios."
        breadcrumb={{ label: "Reportes", href: "/admin/reportes" }}
      />
    );
  }

  const { filas } = await comisionesReporte({ desde, hasta, branchId: sedeId });
  const totalComision = filas.reduce((a, f) => a + f.comision, 0);
  const porcentajes = await prisma.serviceCategory.findMany({
    where: { active: true, services: { some: { active: true } } },
    orderBy: { order: "asc" },
    select: { name: true, commissionPercent: true },
  });

  const enlace = (extra: Record<string, string | undefined>, ruta = "/admin/reportes/comisiones") => {
    const p = new URLSearchParams();
    const base = {
      periodo: periodo === "mes" ? undefined : periodo,
      fecha: fecha === hoy ? undefined : fecha,
      sede: sedeId,
      ...extra,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `${ruta}?${q}` : ruta;
  };

  const enlaceExportar = () => {
    const p = new URLSearchParams({ tipo: "comisiones", desde, hasta });
    if (sedeId) p.set("sede", sedeId);
    return `/admin/reportes/exportar?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Comisiones"
        description={`${etiquetaPeriodo(periodo, fecha)} · un porcentaje por cada servicio realizado.`}
        breadcrumb={{ label: "Reportes", href: "/admin/reportes" }}
      />

      <div className="mb-6 flex">
        {sedes.length > 1 && (
          <Link
            href={enlace({ sede: undefined })}
            className={`border px-4 py-2 text-sm transition-colors ${
              !sedeId ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]" : "border-[1.5px] border-[#d3e3e1] bg-white text-[#3d4643] hover:border-[#1c6f75]"
            }`}
          >
            Ambas
          </Link>
        )}
        {sedes.map((s) => (
          <Link
            key={s.id}
            href={enlace({ sede: s.id })}
            className={`border border-l-0 px-4 py-2 text-sm transition-colors ${
              sedeId === s.id ? "border-[1.5px] border-[#1c6f75] bg-[#9ee5e7] font-semibold text-[#1f2725]" : "border-[1.5px] border-[#d3e3e1] bg-white text-[#3d4643] hover:border-[#1c6f75]"
            }`}
          >
            {s.city}
          </Link>
        ))}
      </div>

      <PeriodoSwitcher
        periodo={periodo}
        etiqueta={etiquetaPeriodo(periodo, fecha)}
        hrefPeriodo={(p) => enlace({ periodo: p === "mes" ? undefined : p })}
        navegacion={{
          anterior: enlace({ fecha: moverPeriodo(periodo, fecha, -1) }),
          hoy: enlace({ fecha: undefined }),
          siguiente: enlace({ fecha: moverPeriodo(periodo, fecha, 1) }),
        }}
        extra={
          <a
            href={enlaceExportar()}
            className="btn btn-outline px-4 py-2 text-xs"
          >
            Descargar CSV
          </a>
        }
      />

      <p className="mb-6 border border-stone bg-white px-4 py-3 text-sm text-ink">
        Cada servicio deja a quien lo hizo el porcentaje de su línea sobre lo cobrado:{" "}
        {porcentajes.map((c, i) => (
          <span key={c.name}>
            {i > 0 && ", "}
            {c.name} <strong>{c.commissionPercent ?? 0}%</strong>
          </span>
        ))}
        . Los productos no comisionan.{" "}
        <Link href="/admin/servicios" className="text-marea underline underline-offset-2">
          Cambiar en Servicios
        </Link>
      </p>

      {filas.length === 0 ? (
        <EmptyState
          title="Sin comisiones en este período"
          description="Aparecen acá cuando hay servicios en citas atendidas o ventas con profesional asignada."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Profesional</Th>
                <Th>Servicios</Th>
                <Th>Cobrado</Th>
                <Th>Comisión</Th>
                <Th className="text-right">Historial</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <Td className="text-sm text-ink">
                    <Link href={enlace({}, `/admin/reportes/comisiones/${f.id}`)} className="hover:text-marea hover:underline">
                      {f.name}
                    </Link>
                  </Td>
                  <Td className="text-sm font-normal text-muted">{f.servicios}</Td>
                  <Td className="text-sm font-normal text-muted">{formatCOP(f.ventas)}</Td>
                  <Td className="text-sm text-ink">{formatCOP(f.comision)}</Td>
                  <Td className="text-right">
                    <Link
                      href={enlace({}, `/admin/reportes/comisiones/${f.id}`)}
                      className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-marea"
                    >
                      Ver detalle
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-4 text-right text-sm text-ink">
            Total a pagar: <span className="font-semibold">{formatCOP(totalComision)}</span>
          </p>
        </>
      )}
    </>
  );
}
