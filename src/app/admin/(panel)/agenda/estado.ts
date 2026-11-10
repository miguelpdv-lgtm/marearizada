/** Los 5 estados posibles de una cita, en un solo lugar para no repetirlo
 * (validación en el server action, etiquetas y colores en las vistas). */
export const ESTADOS = [
  "POR_PAGAR",
  "PENDIENTE",
  "CONFIRMADA",
  "ATENDIDA",
  "CANCELADA",
  "NO_ASISTIO",
] as const;

export const ETIQUETA: Record<string, string> = {
  POR_PAGAR: "Esperando abono",
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

export const TONO: Record<string, "neutral" | "success" | "warning" | "gold" | "danger"> = {
  POR_PAGAR: "gold",
  PENDIENTE: "warning",
  CONFIRMADA: "success",
  ATENDIDA: "neutral",
  CANCELADA: "danger",
  NO_ASISTIO: "danger",
};

/** Mismo color por estado en los bloques del calendario (semana y profesionales). */
export const COLOR: Record<string, string> = {
  POR_PAGAR: "border-l-[#cdaa9c] border-dashed bg-white text-[#5f6b68]",
  // Colores del sistema: concha = espera algo, espuma/marea = en firme,
  // gris = ya pasó, alerta = no se dio.
  PENDIENTE: "border-l-[#9a5b49] bg-[#f3e3dc] text-[#1f2725]",
  CONFIRMADA: "border-l-[#1c6f75] bg-[#d8f5f6] text-[#1f2725]",
  ATENDIDA: "border-l-[#5f6b68] bg-[#eef3f2] text-[#5f6b68]",
  CANCELADA: "border-l-[#a8452e] bg-[#fbe9e4] text-[#5f6b68] line-through",
  NO_ASISTIO: "border-l-[#a8452e] bg-[#fbe9e4] text-[#5f6b68]",
};

/**
 * Cómo se dibuja una cita en el calendario (semana y profesionales).
 *
 * Antes cada bloque ocupaba exactamente su franja: una cita de 9:00 a 10:00 y
 * otra de 10:00 a 11:00 se tocaban píxel con píxel, y con esquinas casi rectas
 * y sin sombra se leían como un solo bloque largo. Ahora cada una se encoge
 * `SEPARACION_PX` por arriba y por abajo —queda un hueco visible entre
 * consecutivas— y se pinta como tarjeta: esquinas, borde claro y sombra.
 */
export const BLOQUE_CITA =
  "absolute overflow-hidden rounded-md border border-white/90 border-l-4 text-left " +
  "shadow-[0_1px_3px_rgb(15_50_54/0.14)] transition hover:z-10 hover:shadow-[0_4px_12px_rgb(15_50_54/0.22)] hover:brightness-[0.97]";

const SEPARACION_PX = 2;

/** `top` y `height` de un bloque, con el hueco entre citas ya descontado. */
/** Alto mínimo de un bloque: lo justo para que se lea la hora. */
const ALTO_MINIMO_PX = 24;

export function posicionBloque(topPct: number, altoPct: number) {
  return {
    top: `calc(${topPct}% + ${SEPARACION_PX}px)`,
    height: `calc(${altoPct}% - ${SEPARACION_PX * 2}px)`,
    minHeight: ALTO_MINIMO_PX,
  };
}

/** Píxeles por minuto del calendario. A 1,1 una cita de 30 min medía 33 px y
 * no cabían ni la hora ni el servicio; a 1,6 mide 48. */
export const PX_POR_MINUTO = 1.6;

export const aHoraTexto = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Reparte en columnas lado a lado las citas que se solapan, como cualquier
 * calendario. Sin esto, dos citas a la misma hora se dibujan exactamente una
 * encima de la otra y solo se ve la última.
 *
 * Lo usan las dos vistas. La de profesionales no lo tenía, y con datos de
 * prueba no se notaba; con el histórico real sí, porque en un salón es normal
 * que una profesional atienda a dos clientas a la vez —una con el color
 * actuando mientras le corta a otra—.
 *
 * El solape se mide por lo que la cita **ocupa en pantalla**, no solo por la
 * hora. Una cita de 10 minutos se dibuja con `ALTO_MINIMO_PX`, que a
 * `PX_POR_MINUTO` equivale a unos 15: aunque en el reloj termine antes de que
 * empiece la siguiente, en pantalla la invade, y la siguiente la tapaba.
 *
 * Algoritmo estándar de layout de eventos: se recorren ordenadas por inicio,
 * cada una entra en la primera columna libre, y un grupo de citas mutuamente
 * solapadas comparte el mismo número de columnas (de ahí sale el ancho).
 */
export function distribuirColumnas(
  citas: { id: string; inicioMin: number; finMin: number }[],
): Map<string, { columna: number; columnas: number }> {
  const minVisual = ALTO_MINIMO_PX / PX_POR_MINUTO;
  const resultado = new Map<string, { columna: number; columnas: number }>();
  const ordenadas = [...citas]
    .map((c) => ({ ...c, finMin: Math.max(c.finMin, c.inicioMin + minVisual) }))
    .sort((a, b) => a.inicioMin - b.inicioMin || a.finMin - b.finMin);

  let grupo: { id: string; columna: number }[] = [];
  let finColumnas: number[] = [];

  const cerrarGrupo = () => {
    if (grupo.length === 0) return;
    const columnas = finColumnas.length;
    for (const g of grupo) resultado.set(g.id, { columna: g.columna, columnas });
    grupo = [];
    finColumnas = [];
  };

  for (const c of ordenadas) {
    if (finColumnas.length > 0 && c.inicioMin >= Math.max(...finColumnas)) cerrarGrupo();
    let columna = finColumnas.findIndex((fin) => fin <= c.inicioMin);
    if (columna === -1) {
      columna = finColumnas.length;
      finColumnas.push(c.finMin);
    } else {
      finColumnas[columna] = c.finMin;
    }
    grupo.push({ id: c.id, columna });
  }
  cerrarGrupo();

  return resultado;
}
