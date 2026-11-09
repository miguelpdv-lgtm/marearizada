import Link from "next/link";

import { PageHeader } from "@/components/admin/ui";
import { PeriodoSwitcher } from "@/components/admin/PeriodoSwitcher";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { aUtc, hoyBogota } from "@/lib/agenda";
import { esPeriodo, etiquetaPeriodo, moverPeriodo, periodoAnterior, rangoPeriodo, type Periodo } from "@/lib/reportPeriod";
import { formatCOP } from "@/lib/format";
import { ETIQUETA } from "../agenda/estado";
import { METODO_PAGO_LABEL, type MetodoPago } from "@/lib/constants";
import { mediosDePagoReporte, resumenReporte } from "./queries";
import { BookingOriginChart, DailyBookingsChart, RevenueTrendChart } from "./Charts";
import { GraficaDona } from "@/components/admin/GraficaDona";
import { desgloseVentas, tajadasDesglose } from "@/lib/desgloseVentas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reportes" };

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; fecha?: string; sede?: string }>;
}) {
  const sp = await searchParams;
  const hoy = hoyBogota();

  const periodo: Periodo = esPeriodo(sp.periodo) ? sp.periodo : "mes";
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const { desde, hasta } = rangoPeriodo(periodo, fecha);
  const { desde: desdeAnterior, hasta: hastaAnterior } = periodoAnterior(periodo, fecha);

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
        title="Reportes"
        description="No tienes ninguna sede asignada — pídele a un administrador que te asigne una en Usuarios."
      />
    );
  }

  const [actual, anterior, medios, desglose] = await Promise.all([
    resumenReporte({ desde, hasta, branchId: sedeId }),
    resumenReporte({ desde: desdeAnterior, hasta: hastaAnterior, branchId: sedeId }),
    mediosDePagoReporte({ desde, hasta, branchId: sedeId }),
    // Las mismas donas de Ventas, para el período elegido.
    desgloseVentas({
      branchIds: sedeId ? [sedeId] : sedes.map((s) => s.id),
      desde: aUtc(desde, "00:00"),
      hasta: aUtc(hasta, "00:00"),
    }),
  ]);
  const donas = tajadasDesglose(desglose);
  const masUsado = medios[0];
  const etiquetaMedio = (m: string) => METODO_PAGO_LABEL[m as MetodoPago] ?? m;

  const enlace = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = {
      periodo: periodo === "mes" ? undefined : periodo,
      fecha: fecha === hoy ? undefined : fecha,
      sede: sedeId,
      ...extra,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/admin/reportes?${p.toString()}`;
  };

  const enlaceExportar = () => {
    const p = new URLSearchParams({ tipo: "resumen", desde, hasta });
    if (sedeId) p.set("sede", sedeId);
    return `/admin/reportes/exportar?${p.toString()}`;
  };

  const delta = (a: number, b: number) =>
    b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10;

  return (
    <>
      <PageHeader
        title="Reportes"
        description={`${etiquetaPeriodo(periodo, fecha)} · comparado con el período anterior.`}
        action={{ label: "Comisiones", href: "/admin/reportes/comisiones" }}
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

      <div className="grid gap-px border border-stone bg-stone sm:grid-cols-2 lg:grid-cols-4">
        <Metrica label="reservas" valor={actual.totalReservas} delta={delta(actual.totalReservas, anterior.totalReservas)} />
        <Metrica label="ingresos" valor={formatCOP(actual.ingresos)} delta={delta(actual.ingresos, anterior.ingresos)} />
        <Metrica
          label="clientes nuevos"
          valor={actual.nuevosClientes}
          delta={delta(actual.nuevosClientes, anterior.nuevosClientes)}
        />
        <Metrica
          label="ocupación aproximada"
          valor={actual.ocupacion != null ? `${Math.round(actual.ocupacion * 100)}%` : "—"}
        />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="admin-card bg-paper p-6 sm:p-7">
          <div className="mb-6">
            <p className="admin-kicker mb-2">Ritmo del período</p>
            <h2 className="t-card text-ink">Reservas por día</h2>
            <p className="mt-1 text-sm text-muted">La actividad operativa de la sede seleccionada.</p>
          </div>
          <DailyBookingsChart datos={actual.porDia} />
        </section>

        <section className="admin-card bg-pink-pale p-6 sm:p-7">
          <div className="mb-6">
            <p className="admin-kicker mb-2">Canal de entrada</p>
            <h2 className="t-card text-ink">Origen de las reservas</h2>
            <p className="mt-1 text-sm text-muted">Online frente a agenda manual.</p>
          </div>
          <BookingOriginChart online={actual.online} manual={actual.manual} />
        </section>
      </div>

      <section className="admin-card mt-4 bg-cream p-6 sm:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="admin-kicker mb-2">Ingresos atendidos</p>
            <h2 className="t-card text-ink">Tendencia del período</h2>
          </div>
          <p className="text-xs text-muted">Solo reservas marcadas como atendidas</p>
        </div>
        <RevenueTrendChart datos={actual.porDia} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GraficaDona titulo="Servicios vs. productos" tajadas={donas.tipo} />
        <GraficaDona titulo="Medios de pago" tajadas={donas.metodo} />
      </div>
      <p className="mt-2 text-xs text-muted">
        En pesos pagados: ventas, citas atendidas y el histórico de AgendaPro.
        {masUsado &&
          ` El medio más usado: ${etiquetaMedio(masUsado.medio)} (${masUsado.veces} ${masUsado.veces === 1 ? "pago" : "pagos"}).`}
      </p>

      <div className="mt-10">
        <p className="mb-3 text-[11px] tracking-[0.12em] text-muted uppercase">Reservas por estado</p>
        <div className="grid gap-px border border-stone bg-stone sm:grid-cols-5">
          {Object.entries(ETIQUETA).map(([estado, etiqueta]) => (
            <div key={estado} className="bg-white px-5 py-4">
              <p className="display text-2xl text-ink">{actual.porEstado[estado] ?? 0}</p>
              <p className="t-small mt-1">{etiqueta.toLowerCase()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-3 text-[11px] tracking-[0.12em] text-muted uppercase">
          Origen de las reservas
        </p>
        <div className="grid gap-px border border-stone bg-stone sm:grid-cols-2">
          <div className="bg-white px-5 py-4">
            <p className="display text-2xl text-ink">{actual.online}</p>
            <p className="t-small mt-1">desde el sitio (online)</p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="display text-2xl text-ink">{actual.manual}</p>
            <p className="t-small mt-1">cargadas a mano en el panel</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Metrica({
  label,
  valor,
  delta,
}: {
  label: string;
  valor: string | number;
  delta?: number | null;
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="display text-2xl text-ink">{valor}</p>
      <p className="t-small mt-1">{label}</p>
      {delta != null && (
        <p className={`mt-1 text-xs ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs. período anterior
        </p>
      )}
    </div>
  );
}
