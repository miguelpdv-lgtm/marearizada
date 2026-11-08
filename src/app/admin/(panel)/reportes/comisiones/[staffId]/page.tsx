import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { PeriodoSwitcher } from "@/components/admin/PeriodoSwitcher";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { hoyBogota } from "@/lib/agenda";
import { calcularComision } from "@/lib/ajustes-datos";
import { esPeriodo, etiquetaPeriodo, moverPeriodo, rangoPeriodo, type Periodo } from "@/lib/reportPeriod";
import { formatCOP, formatDateTime } from "@/lib/format";
import { lineasComision, reglaComision } from "../../queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial de la profesional" };

/**
 * El historial de una profesional en el período, línea por línea: de dónde
 * sale lo que aparece en Comisiones, para hacer cuentas con ella. Usa las
 * mismas líneas que la tabla de Comisiones, así que el total cuadra.
 */
export default async function HistorialProfesionalPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ periodo?: string; fecha?: string; sede?: string }>;
}) {
  const { staffId } = await params;
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

  const profesional = await prisma.teamMember.findUnique({
    where: { id: staffId },
    select: { id: true, name: true, branchId: true, branch: { select: { city: true } } },
  });
  // Solo se ve el historial de alguien de una sede a la que se tiene acceso.
  if (!profesional || !sedes.some((s) => s.id === profesional.branchId)) notFound();

  const [lineas, { paso, valor }] = await Promise.all([
    lineasComision({ desde, hasta, branchId: sedeId, staffId }),
    reglaComision(),
  ]);
  const vendido = lineas.reduce((a, l) => a + l.valor, 0);
  const descuentos = lineas.reduce((a, l) => a + l.descuento, 0);
  const comision = calcularComision(vendido, paso, valor);
  const tramos = paso > 0 ? Math.floor(vendido / paso) : 0;

  const enlace = (extra: Record<string, string | undefined>, base = `/admin/reportes/comisiones/${staffId}`) => {
    const p = new URLSearchParams();
    const todo = {
      periodo: periodo === "mes" ? undefined : periodo,
      fecha: fecha === hoy ? undefined : fecha,
      sede: sedeId,
      ...extra,
    };
    for (const [k, v] of Object.entries(todo)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  const enlaceExportar = () => {
    const p = new URLSearchParams({ tipo: "comisiones-detalle", desde, hasta, staff: staffId });
    if (sedeId) p.set("sede", sedeId);
    return `/admin/reportes/exportar?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={profesional.name}
        description={`Historial de ${etiquetaPeriodo(periodo, fecha).toLowerCase()} · ${profesional.branch?.city ?? ""}`}
        breadcrumb={{ label: "Comisiones", href: enlace({}, "/admin/reportes/comisiones") }}
      />

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

      <div className="mb-6 grid gap-px border border-stone bg-stone sm:grid-cols-4">
        <Cifra label="vendido" valor={formatCOP(vendido)} />
        <Cifra label="descuentos dados" valor={descuentos > 0 ? `−${formatCOP(descuentos)}` : formatCOP(0)} />
        <Cifra label={`tramos de ${formatCOP(paso)}`} valor={String(tramos)} />
        <Cifra label="comisión" valor={formatCOP(comision)} destacado />
      </div>

      {lineas.length === 0 ? (
        <EmptyState
          title="Sin movimientos en este período"
          description="Aquí aparece cada cita atendida y cada venta en la que participó."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Origen</Th>
              <Th>Clienta</Th>
              <Th>Servicio o producto</Th>
              <Th className="hidden md:table-cell">Valor</Th>
              <Th className="hidden md:table-cell">Descuento</Th>
              <Th>Cuenta</Th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-sand/30">
                <Td className="whitespace-nowrap text-sm text-ink">{formatDateTime(l.fecha)}</Td>
                <Td className="text-sm text-muted">
                  {l.href ? (
                    <Link href={l.href} className="underline-offset-2 hover:text-terra hover:underline">
                      {l.origen} {l.codigo}
                    </Link>
                  ) : (
                    `${l.origen} ${l.codigo}`
                  )}
                </Td>
                <Td className="max-w-44 text-sm text-muted">{l.cliente}</Td>
                <Td className="max-w-64 text-sm text-ink">
                  {l.cantidad > 1 && `${l.cantidad}× `}
                  {l.concepto}
                </Td>
                <Td className="hidden whitespace-nowrap text-sm text-muted md:table-cell">
                  {formatCOP(l.valorLista)}
                </Td>
                <Td className="hidden whitespace-nowrap text-sm md:table-cell">
                  {l.descuento > 0 ? (
                    <span className="text-terra">−{formatCOP(l.descuento)}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-sm font-semibold text-ink">{formatCOP(l.valor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {lineas.length > 0 && (
        <p className="mt-4 text-right text-sm text-ink">
          {lineas.length} {lineas.length === 1 ? "línea" : "líneas"} · Total vendido{" "}
          <span className="font-semibold">{formatCOP(vendido)}</span> · Comisión{" "}
          <span className="font-semibold">{formatCOP(comision)}</span>
        </p>
      )}
    </>
  );
}

function Cifra({ label, valor, destacado = false }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={destacado ? "bg-cream px-5 py-4" : "bg-white px-5 py-4"}>
      <p className="display text-2xl text-ink">{valor}</p>
      <p className="t-small mt-1">{label}</p>
    </div>
  );
}
