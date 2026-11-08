/** Fechas para mostrarle a la clienta. Sin "use client": las usan páginas del servidor y del navegador. */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-10-14" → "miércoles 14 de octubre". */
export function etiquetaFecha(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  const dia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][
    dt.getUTCDay()
  ];
  return `${dia} ${d} de ${MESES[m - 1]}`;
}

/** "14:30" → "2:30 p.m." */
export function hora12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "p.m." : "a.m."}`;
}
