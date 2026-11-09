import "server-only";

import { prisma } from "@/lib/db";
import { ESTADOS_ACTIVOS, aUtc, diaSemanaBogota, fechaBogota, sumarDias } from "@/lib/agenda";
import { SELECT_PORCENTAJE, comision, porcentajeDe } from "@/lib/comisiones";

export type RangoReporte = { desde: string; hasta: string; branchId?: string };

const minutosEntre = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.max(0, bh * 60 + bm - (ah * 60 + am));
};

function diasDelRango(desde: string, hasta: string) {
  const dias: string[] = [];
  let d = desde;
  while (d < hasta) {
    dias.push(d);
    d = sumarDias(d, 1);
  }
  return dias;
}

/**
 * Métricas del "Resumen" (como AgendaPro): reservas por estado, ingresos,
 * clientes nuevos, origen de reservas y una ocupación aproximada (minutos
 * reservados ÷ minutos disponibles según horario semanal del equipo, menos
 * bloqueos). Es una aproximación honesta, no un cálculo exacto — no cuenta
 * festivos ni cambios de horario dentro del rango.
 */
export async function resumenReporte({ desde, hasta, branchId }: RangoReporte) {
  const desdeUtc = aUtc(desde, "00:00");
  const hastaUtc = aUtc(hasta, "00:00");
  const filtroSede = branchId ? { branchId } : {};

  const [citas, primeraVisita, staffSchedules, bloqueos] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...filtroSede, startsAt: { gte: desdeUtc, lt: hastaUtc } },
      select: {
        startsAt: true,
        status: true,
        source: true,
        priceOverride: true,
        service: { select: { price: true, durationMin: true } },
        items: { select: { unitPrice: true, quantity: true } },
      },
    }),
    prisma.appointment.groupBy({
      by: ["clientPhone"],
      where: filtroSede,
      _min: { startsAt: true },
    }),
    prisma.staffSchedule.findMany({
      where: { staff: { active: true, ...(branchId ? { branchId } : {}) } },
      select: { weekday: true, opensAt: true, closesAt: true, closed: true },
    }),
    prisma.timeOff.findMany({
      where: { ...filtroSede, startsAt: { lt: hastaUtc }, endsAt: { gt: desdeUtc } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const porEstado: Record<string, number> = {};
  let ingresos = 0;
  let online = 0;
  let manual = 0;
  for (const c of citas) {
    porEstado[c.status] = (porEstado[c.status] ?? 0) + 1;
    if (c.status === "ATENDIDA") {
      const adicionales = c.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
      ingresos += (c.priceOverride ?? c.service.price) + adicionales;
    }
    if (c.source === "ADMIN") manual++;
    else online++;
  }

  const nuevosClientes = primeraVisita.filter(
    (p) => p._min.startsAt && p._min.startsAt >= desdeUtc && p._min.startsAt < hastaUtc,
  ).length;

  let minutosDisponibles = 0;
  for (const dia of diasDelRango(desde, hasta)) {
    const weekday = diaSemanaBogota(dia);
    for (const s of staffSchedules) {
      if (s.weekday === weekday && !s.closed) minutosDisponibles += minutosEntre(s.opensAt, s.closesAt);
    }
  }
  const minutosBloqueados = bloqueos.reduce((a, b) => {
    const ini = Math.max(b.startsAt.getTime(), desdeUtc.getTime());
    const fin = Math.min(b.endsAt.getTime(), hastaUtc.getTime());
    return a + Math.max(0, (fin - ini) / 60_000);
  }, 0);
  minutosDisponibles = Math.max(0, minutosDisponibles - minutosBloqueados);

  const minutosReservados = citas
    .filter((c) => ESTADOS_ACTIVOS.includes(c.status))
    .reduce((a, c) => a + c.service.durationMin, 0);

  const porDiaMap = new Map<string, { reservas: number; ingresos: number }>();
  for (const dia of diasDelRango(desde, hasta)) {
    porDiaMap.set(dia, { reservas: 0, ingresos: 0 });
  }
  for (const c of citas) {
    const dia = porDiaMap.get(fechaBogota(c.startsAt));
    if (!dia) continue;
    dia.reservas++;
    if (c.status === "ATENDIDA") {
      dia.ingresos += (c.priceOverride ?? c.service.price) +
        c.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    }
  }

  return {
    totalReservas: citas.length,
    porEstado,
    ingresos,
    nuevosClientes,
    online,
    manual,
    ocupacion: minutosDisponibles > 0 ? minutosReservados / minutosDisponibles : null,
    porDia: [...porDiaMap.entries()].map(([fecha, datos]) => ({ fecha, ...datos })),
  };
}

/**
 * Con qué se paga: cuántas veces y cuánta plata entró por cada medio.
 *
 * Junta las tres fuentes de cobro: el desglose de las ventas (mostrador y
 * pedidos en línea), el medio que se marcó al atender una cita y los abonos
 * en línea. De una cita se cuenta lo que se cobró en el salón (sin el abono,
 * que ya aparece como abono en línea).
 */
export async function mediosDePagoReporte({ desde, hasta, branchId }: RangoReporte) {
  const desdeUtc = aUtc(desde, "00:00");
  const hastaUtc = aUtc(hasta, "00:00");
  const filtroSede = branchId ? { branchId } : {};

  const [partesVenta, citas] = await Promise.all([
    prisma.salePayment.findMany({
      where: { sale: { ...filtroSede, createdAt: { gte: desdeUtc, lt: hastaUtc } } },
      select: { method: true, amount: true },
    }),
    prisma.appointment.findMany({
      where: {
        ...filtroSede,
        status: "ATENDIDA",
        startsAt: { gte: desdeUtc, lt: hastaUtc },
        // Las finalizadas ya cuentan por el desglose de su venta.
        sale: null,
        OR: [{ paymentMethod: { not: null } }, { depositPaid: { gt: 0 } }],
      },
      select: {
        paymentMethod: true,
        depositPaid: true,
        priceOverride: true,
        service: { select: { price: true } },
        items: { select: { unitPrice: true, quantity: true } },
      },
    }),
  ]);

  const porMedio = new Map<string, { veces: number; monto: number }>();
  const sumar = (medio: string, monto: number) => {
    const actual = porMedio.get(medio) ?? { veces: 0, monto: 0 };
    porMedio.set(medio, { veces: actual.veces + 1, monto: actual.monto + monto });
  };

  for (const p of partesVenta) sumar(p.method, p.amount);
  for (const c of citas) {
    const total =
      (c.priceOverride ?? c.service.price) + c.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    if (c.depositPaid > 0) sumar("EN_LINEA", c.depositPaid);
    if (c.paymentMethod) sumar(c.paymentMethod, Math.max(0, total - c.depositPaid));
  }

  const montoTotal = [...porMedio.values()].reduce((a, m) => a + m.monto, 0);
  return [...porMedio.entries()]
    .map(([medio, m]) => ({
      medio,
      veces: m.veces,
      monto: m.monto,
      participacion: montoTotal > 0 ? m.monto / montoTotal : 0,
    }))
    .sort((a, b) => b.veces - a.veces || b.monto - a.monto);
}

/** Una línea que cuenta para la comisión de una profesional. */
export type LineaComision = {
  /** Único dentro del reporte. */
  id: string;
  staffId: string;
  fecha: Date;
  origen: "Cita" | "Venta";
  /** Código de la cita o de la venta. */
  codigo: string;
  cliente: string;
  concepto: string;
  cantidad: number;
  /** Precio de lista de la línea (unitario × cantidad). */
  valorLista: number;
  descuento: number;
  /** Lo que cuenta para la comisión: valorLista − descuento. */
  valor: number;
  /** % de comisión del servicio (foto de la venta, o el vigente si aún no se vendió). */
  porcentaje: number;
  /** Pesos de comisión de esta línea. */
  comision: number;
  /** Para abrir la venta en el panel, cuando es una venta. */
  href?: string;
};

/**
 * Todo lo que comisiona en el rango, línea por línea: cada servicio de una
 * cita atendida (sin finalizar todavía) y cada servicio de una venta
 * (incluidas las de citas finalizadas). Los productos no comisionan. Cada línea es de quien la
 * vendió; si no tiene, de la profesional de la cita o la venta.
 *
 * `comisionesReporte` suma estas mismas líneas, así que el detalle de una
 * profesional siempre cuadra con su total.
 */
export async function lineasComision({
  desde,
  hasta,
  branchId,
  staffId,
}: RangoReporte & { staffId?: string }): Promise<LineaComision[]> {
  const desdeUtc = aUtc(desde, "00:00");
  const hastaUtc = aUtc(hasta, "00:00");
  const filtroSede = branchId ? { branchId } : {};
  // Con una profesional, solo lo que pudo ser suyo; sin ella, todo lo que
  // tenga a alguien asignado.
  const deQuien = staffId
    ? { OR: [{ staffId }, { items: { some: { staffId } } }] }
    : { OR: [{ staffId: { not: null } }, { items: { some: { staffId: { not: null } } } }] };

  const [citas, ventas] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...filtroSede,
        status: "ATENDIDA",
        startsAt: { gte: desdeUtc, lt: hastaUtc },
        // Las finalizadas ya cuentan por su venta (abajo), línea por línea.
        sale: null,
        ...deQuien,
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        code: true,
        startsAt: true,
        clientName: true,
        staffId: true,
        priceOverride: true,
        service: { select: { name: true, price: true, ...SELECT_PORCENTAJE } },
        items: {
          select: {
            id: true,
            kind: true,
            name: true,
            unitPrice: true,
            quantity: true,
            staffId: true,
            service: { select: SELECT_PORCENTAJE },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.sale.findMany({
      where: { ...filtroSede, createdAt: { gte: desdeUtc, lt: hastaUtc }, ...deQuien },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        code: true,
        createdAt: true,
        clientName: true,
        staffId: true,
        items: {
          select: {
            id: true,
            kind: true,
            name: true,
            unitPrice: true,
            quantity: true,
            discount: true,
            staffId: true,
            commissionPercent: true,
            service: { select: SELECT_PORCENTAJE },
          },
        },
      },
    }),
  ]);

  const lineas: LineaComision[] = [];
  const agregar = (l: Omit<LineaComision, "comision">) => {
    if (!staffId || l.staffId === staffId) lineas.push({ ...l, comision: comision(l.valor, l.porcentaje) });
  };

  for (const c of citas) {
    if (c.staffId) {
      const valor = c.priceOverride ?? c.service.price;
      // Un precio ajustado a la baja es un descuento; uno al alza, no.
      const valorLista = Math.max(valor, c.service.price);
      agregar({
        id: `cita-${c.id}`,
        staffId: c.staffId,
        fecha: c.startsAt,
        origen: "Cita",
        codigo: c.code,
        cliente: c.clientName,
        concepto: c.service.name,
        cantidad: 1,
        valorLista,
        descuento: valorLista - valor,
        valor,
        porcentaje: porcentajeDe(c.service),
      });
    }
    // Lo que se vendió dentro de la cita cuenta para quien lo vendió, que
    // puede ser otra persona del equipo.
    for (const i of c.items) {
      const quien = i.staffId ?? c.staffId;
      if (!quien || i.kind !== "SERVICE") continue;
      const valor = i.unitPrice * i.quantity;
      agregar({
        id: `cita-item-${i.id}`,
        staffId: quien,
        fecha: c.startsAt,
        origen: "Cita",
        codigo: c.code,
        cliente: c.clientName,
        concepto: i.name,
        cantidad: i.quantity,
        valorLista: valor,
        descuento: 0,
        valor,
        porcentaje: porcentajeDe(i.service),
      });
    }
  }

  for (const v of ventas) {
    for (const i of v.items) {
      const quien = i.staffId ?? v.staffId;
      if (!quien || i.kind !== "SERVICE") continue;
      const valorLista = i.unitPrice * i.quantity;
      agregar({
        id: `venta-item-${i.id}`,
        staffId: quien,
        fecha: v.createdAt,
        origen: "Venta",
        codigo: v.code,
        cliente: v.clientName ?? "Sin registrar",
        concepto: i.name,
        cantidad: i.quantity,
        valorLista,
        descuento: i.discount,
        valor: valorLista - i.discount,
        porcentaje: i.commissionPercent ?? porcentajeDe(i.service),
        href: `/admin/ventas/${v.id}`,
      });
    }
  }

  return lineas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Cuánto pagarle a cada profesional en el rango: la suma de la comisión de
 * cada servicio que hizo (`lineasComision`), así que el detalle de una
 * profesional siempre cuadra con su total.
 */
export async function comisionesReporte({ desde, hasta, branchId }: RangoReporte) {
  const [lineas, staff] = await Promise.all([
    lineasComision({ desde, hasta, branchId }),
    prisma.teamMember.findMany({
      where: { active: true, ...(branchId ? { branchId } : {}) },
      select: { id: true, name: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const suma = new Map<string, { ventas: number; comision: number; servicios: number }>();
  for (const l of lineas) {
    const s = suma.get(l.staffId) ?? { ventas: 0, comision: 0, servicios: 0 };
    s.ventas += l.valor;
    s.comision += l.comision;
    s.servicios += l.cantidad;
    suma.set(l.staffId, s);
  }

  const filas = staff
    .map((s) => ({ id: s.id, name: s.name, ...(suma.get(s.id) ?? { ventas: 0, comision: 0, servicios: 0 }) }))
    .filter((s) => s.ventas > 0)
    .sort((a, b) => b.comision - a.comision || b.ventas - a.ventas);

  return { filas };
}
