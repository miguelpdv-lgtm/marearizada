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

  const { filas, paso, valor } = await comisionesReporte({ desde, hasta, branchId: sedeId });
  const totalComision = filas.reduce((a, f) => a + f.comision, 0);

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
        description={`${etiquetaPeriodo(periodo, fecha)} · citas atendidas y ventas de mostrador.`}
        breadcrumb={{ label: "Reportes", href: "/admin/reportes" }}
      />

      <div className="mb-6 flex">
        {sedes.length > 1 && (
          <Link
            href={enlace({ sede: undefined })}
            className={`border px-4 py-2 text-sm transition-colors ${
              !sedeId ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
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
              sedeId === s.id ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
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
            className="border border-ink px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-gold-500"
          >
            Descargar CSV
          </a>
        }
      />

      <p className="mb-6 border border-stone bg-white px-4 py-3 text-sm text-ink">
        {valor > 0 ? (
          <>
            Por cada <strong>{formatCOP(paso)}</strong> vendidos se asignan{" "}
            <strong>{formatCOP(valor)}</strong> de comisión.
          </>
        ) : (
          <>Todavía no hay un valor de comisión configurado.</>
        )}{" "}
        <Link href="/admin/configuracion" className="text-terra underline underline-offset-2">
          Cambiar en Configuración
        </Link>
      </p>

      {filas.length === 0 ? (
        <EmptyState
          title="Sin comisiones en este período"
          description="Aparecen acá cuando hay citas atendidas o ventas con profesional asignada."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Profesional</Th>
                <Th>Vendido</Th>
                <Th>Tramos</Th>
                <Th>Comisión</Th>
                <Th className="text-right">Historial</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <Td className="text-sm text-ink">
                    <Link href={enlace({}, `/admin/reportes/comisiones/${f.id}`)} className="hover:text-terra hover:underline">
                      {f.name}
                    </Link>
                  </Td>
                  <Td className="text-sm font-normal text-muted">{formatCOP(f.ventas)}</Td>
                  <Td className="text-sm font-normal text-muted">{f.tramos}</Td>
                  <Td className="text-sm text-ink">{formatCOP(f.comision)}</Td>
                  <Td className="text-right">
                    <Link
                      href={enlace({}, `/admin/reportes/comisiones/${f.id}`)}
                      className="text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:text-terra"
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
