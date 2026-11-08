import "server-only";

import { sumarDias } from "@/lib/agenda";

/**
 * Selector de período (Día/Semana/Mes/Año) para las páginas de Reportes.
 * Todo trabaja con fechas "YYYY-MM-DD" en hora Bogotá, igual que el resto
 * del módulo de agenda — `hasta` siempre es exclusivo (el día siguiente al
 * último incluido), para poder comparar directo con `startsAt: { lt: hasta }`.
 */

export const PERIODOS = ["dia", "semana", "mes", "anio"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const PERIODO_LABEL: Record<Periodo, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
  anio: "Año",
};

export function esPeriodo(v: string | undefined): v is Periodo {
  return !!v && (PERIODOS as readonly string[]).includes(v);
}

const partes = (fecha: string) => fecha.split("-").map(Number) as [number, number, number];

/** Lunes de la semana que contiene esa fecha. */
function lunesDe(fecha: string) {
  const [a, m, d] = partes(fecha);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return sumarDias(fecha, dow === 0 ? -6 : 1 - dow);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function rangoPeriodo(periodo: Periodo, fecha: string): { desde: string; hasta: string } {
  const [a, m] = partes(fecha);
  switch (periodo) {
    case "dia":
      return { desde: fecha, hasta: sumarDias(fecha, 1) };
    case "semana": {
      const desde = lunesDe(fecha);
      return { desde, hasta: sumarDias(desde, 7) };
    }
    case "mes": {
      const desde = `${a}-${pad2(m)}-01`;
      const hasta = m === 12 ? `${a + 1}-01-01` : `${a}-${pad2(m + 1)}-01`;
      return { desde, hasta };
    }
    case "anio":
      return { desde: `${a}-01-01`, hasta: `${a + 1}-01-01` };
  }
}

/** Nueva fecha ancla al mover el período ±1 (día/semana/mes/año). */
export function moverPeriodo(periodo: Periodo, fecha: string, direccion: 1 | -1): string {
  const [a, m, d] = partes(fecha);
  switch (periodo) {
    case "dia":
      return sumarDias(fecha, direccion);
    case "semana":
      return sumarDias(fecha, direccion * 7);
    case "mes": {
      const total = a * 12 + (m - 1) + direccion;
      const nuevoAnio = Math.floor(total / 12);
      const nuevoMes = (total % 12) + 1;
      const diasEnMes = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
      return `${nuevoAnio}-${pad2(nuevoMes)}-${pad2(Math.min(d, diasEnMes))}`;
    }
    case "anio":
      return `${a + direccion}-${pad2(m)}-${pad2(d)}`;
  }
}

/** El período anterior equivalente (misma duración), para comparar variación. */
export function periodoAnterior(periodo: Periodo, fecha: string) {
  return rangoPeriodo(periodo, moverPeriodo(periodo, fecha, -1));
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Etiqueta legible del período actual, p. ej. "18 → 24 de agosto de 2026". */
export function etiquetaPeriodo(periodo: Periodo, fecha: string): string {
  const { desde, hasta } = rangoPeriodo(periodo, fecha);
  const ultimoDia = sumarDias(hasta, -1);
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(ultimoDia);

  switch (periodo) {
    case "dia":
      return `${d1} de ${MESES[m1 - 1]} de ${a1}`;
    case "mes":
      return `${MESES[m1 - 1][0].toUpperCase()}${MESES[m1 - 1].slice(1)} de ${a1}`;
    case "anio":
      return `${a1}`;
    case "semana": {
      if (a1 !== a2) return `${d1} de ${MESES[m1 - 1]} de ${a1} → ${d2} de ${MESES[m2 - 1]} de ${a2}`;
      if (m1 !== m2) return `${d1} de ${MESES[m1 - 1]} → ${d2} de ${MESES[m2 - 1]} de ${a2}`;
      return `${d1} → ${d2} de ${MESES[m1 - 1]} de ${a1}`;
    }
  }
}
