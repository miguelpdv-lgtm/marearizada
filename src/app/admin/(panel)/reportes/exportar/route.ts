import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sedeEfectiva, sedesPermitidas } from "@/lib/branchAccess";
import { formatCOP } from "@/lib/format";
import { ETIQUETA } from "../../agenda/estado";
import { fechaBogota, horaBogota } from "@/lib/agenda";
import { comisionesReporte, lineasComision, resumenReporte } from "../queries";

/** Arma un CSV a mano — sin librería nueva, sirve para dos tablas chicas. */
function aCsv(encabezados: string[], filas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [encabezados, ...filas].map((fila) => fila.map(escapar).join(","));
  return "﻿" + lineas.join("\n"); // BOM: que Excel abra bien los acentos.
}

function respuestaCsv(contenido: string, nombre: string) {
  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await requireUser();

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const sedeQuery = searchParams.get("sede") ?? undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }

  const todasLasSedes = await prisma.branch.findMany({
    where: { active: true },
    select: { id: true },
  });
  const permitidas = sedesPermitidas(user, todasLasSedes);
  if (permitidas.length === 0) {
    return NextResponse.json({ error: "No tienes ningún local asignado." }, { status: 403 });
  }
  const branchId = sedeEfectiva(permitidas, sedeQuery);

  if (tipo === "comisiones-detalle") {
    const staffId = searchParams.get("staff") ?? "";
    const profesional = await prisma.teamMember.findUnique({
      where: { id: staffId },
      select: { name: true, branchId: true },
    });
    // Solo alguien de una sede a la que se tiene acceso.
    if (!profesional || !permitidas.some((s) => s.id === profesional.branchId)) {
      return NextResponse.json({ error: "Profesional no encontrada." }, { status: 404 });
    }
    const lineas = await lineasComision({ desde, hasta, branchId, staffId });
    const vendido = lineas.reduce((a, l) => a + l.valor, 0);
    const totalComision = lineas.reduce((a, l) => a + l.comision, 0);
    const csv = aCsv(
      ["Fecha", "Hora", "Origen", "Código", "Clienta", "Servicio", "Cantidad", "Valor", "Descuento", "Cobrado", "% comisión", "Comisión"],
      [
        ...lineas.map((l) => [
          fechaBogota(l.fecha),
          horaBogota(l.fecha),
          l.origen,
          l.codigo,
          l.cliente,
          l.concepto,
          l.cantidad,
          l.valorLista,
          l.descuento,
          l.valor,
          l.porcentaje,
          l.comision,
        ]),
        [],
        ["", "", "", "", "", "Total", "", "", "", vendido, "", totalComision],
      ],
    );
    const nombre = profesional.name.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
    return respuestaCsv(csv, `historial_${nombre}_${desde}_${hasta}.csv`);
  }

  if (tipo === "comisiones") {
    const { filas } = await comisionesReporte({ desde, hasta, branchId });
    const csv = aCsv(
      ["Profesional", "Servicios", "Cobrado en servicios", "Comisión"],
      filas.map((f) => [f.name, f.servicios, f.ventas, f.comision]),
    );
    return respuestaCsv(csv, `comisiones_${desde}_${hasta}.csv`);
  }

  const r = await resumenReporte({ desde, hasta, branchId });
  const csv = aCsv(
    ["Métrica", "Valor"],
    [
      ["Reservas totales", r.totalReservas],
      ...Object.entries(ETIQUETA).map(([estado, etiqueta]) => [etiqueta, r.porEstado[estado] ?? 0]),
      ["Ingresos (atendidas)", formatCOP(r.ingresos)],
      ["Clientes nuevos", r.nuevosClientes],
      ["Reservas online", r.online],
      ["Reservas cargadas a mano", r.manual],
      ["Ocupación aproximada", r.ocupacion != null ? `${Math.round(r.ocupacion * 100)}%` : "—"],
    ],
  );
  return respuestaCsv(csv, `resumen_${desde}_${hasta}.csv`);
}
