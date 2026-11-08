/**
 * Ilustraciones de servicio: un dibujo por servicio, para usar mientras no
 * haya foto subida desde el panel.
 *
 * Estilo, de la mano del manual: línea fina y pareja en vino (el trazo del
 * isotipo, con sus hebras paralelas), sobre un bloque plano de la paleta y
 * un círculo de color detrás, como en el moodboard. Objetos reales del
 * salón, dibujados de frente y sin caras ni gestos: no es caricatura.
 *
 * El dibujo se elige por el nombre del servicio (palabras clave, en orden:
 * la primera regla que calza gana) y el color de fondo por la categoría.
 * Así un mismo servicio se ve igual en Barranquilla y en Cali, y uno nuevo
 * cae en el dibujo más cercano en vez de quedar vacío.
 */

const VINO = "#5b001d";

/* -------------------------------------------------------------------------- */
/* Trazos base                                                                */
/* -------------------------------------------------------------------------- */

const r = (n: number) => Math.round(n * 10) / 10;

/** Hebra vertical ondulada. `creciente`: lisa arriba y rizada abajo. */
function onda(
  x0: number,
  y0: number,
  largo: number,
  amp: number,
  periodo: number,
  { fase = 0, creciente = false }: { fase?: number; creciente?: boolean } = {},
) {
  let d = "";
  for (let y = 0; y <= largo; y += 3) {
    const a = creciente ? amp * Math.min(1, (y / largo) * 1.6) : amp;
    const x = x0 + a * Math.sin((y / periodo) * Math.PI * 2 + fase);
    d += `${y === 0 ? "M" : "L"}${r(x)} ${r(y0 + y)}`;
  }
  return d;
}

/**
 * Rizo: una hebra en espiral vista de lado (cicloide alargada). `vueltas`
 * espirales a lo largo de `largo`, con `radio` de ancho.
 */
function rizo(cx: number, y0: number, largo: number, radio: number, vueltas: number, fase = 0) {
  let d = "";
  const total = vueltas * Math.PI * 2;
  const paso = largo / total;
  for (let t = 0; t <= total; t += 0.12) {
    const x = cx + radio * Math.sin(t + fase);
    const y = y0 + paso * t - radio * 0.55 * Math.cos(t + fase);
    d += `${t === 0 ? "M" : "L"}${r(x)} ${r(y)}`;
  }
  return d;
}

/** Espiral plana (un rizo visto de frente, un moño). */
function espiral(cx: number, cy: number, r0: number, r1: number, vueltas: number, fase = 0) {
  let d = "";
  const total = vueltas * Math.PI * 2;
  for (let t = 0; t <= total; t += 0.1) {
    const rad = r0 + (r1 - r0) * (t / total);
    d += `${t === 0 ? "M" : "L"}${r(cx + rad * Math.cos(t + fase))} ${r(cy + rad * Math.sin(t + fase))}`;
  }
  return d;
}

/** Gota. */
function gota(cx: number, cy: number, s = 1) {
  return `M${cx} ${cy - 42 * s}C${cx + 30 * s} ${cy - 6 * s} ${cx + 30 * s} ${cy + 30 * s} ${cx} ${cy + 30 * s}C${cx - 30 * s} ${cy + 30 * s} ${cx - 30 * s} ${cy - 6 * s} ${cx} ${cy - 42 * s}Z`;
}

/* -------------------------------------------------------------------------- */
/* Objetos                                                                    */
/* -------------------------------------------------------------------------- */

function Tijeras({ x, y, giro = 0, s = 1 }: { x: number; y: number; giro?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${s})`}>
      <path d="M-4 6L-26 -92L-14 -90L6 4" />
      <path d="M4 6L26 -92L14 -90L-6 4" />
      <circle cx="0" cy="0" r="3.5" />
      <path d="M-5 10C-12 24 -18 34 -26 40" />
      <path d="M5 10C12 24 18 34 26 40" />
      <circle cx="-32" cy="52" r="15" />
      <circle cx="32" cy="52" r="15" />
    </g>
  );
}

function Peine({ x, y, giro = 0, largo = 150 }: { x: number; y: number; giro?: number; largo?: number }) {
  const dientes = [];
  for (let i = 8; i < largo - 4; i += 8) dientes.push(<path key={i} d={`M${i} 16V${i < largo * 0.45 ? 44 : 38}`} />);
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <rect x="0" y="0" width={largo} height="16" rx="4" />
      {dientes}
    </g>
  );
}

function Gotero({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 -96C-14 -112 14 -112 14 -96V-78H-14Z" />
      <rect x="-20" y="-78" width="40" height="16" rx="3" />
      <path d="M-34 -62H34V40C34 50 26 58 16 58H-16C-26 58 -34 50 -34 40Z" />
      <path d="M-34 -30H34" />
      <path d="M-20 -14H10" />
      <path d="M-20 -2H-2" />
    </g>
  );
}

function Frasco({ x, y, alto = 110 }: { x: number; y: number; alto?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-40" y={-alto / 2} width="80" height="20" rx="3" />
      <path d={`M-44 ${-alto / 2 + 20}H44V${alto / 2 - 10}C44 ${alto / 2} 36 ${alto / 2 + 6} 26 ${alto / 2 + 6}H-26C-36 ${alto / 2 + 6} -44 ${alto / 2} -44 ${alto / 2 - 10}Z`} />
      <path d={`M-44 ${-alto / 2 + 44}H44`} />
      <path d={`M-44 ${alto / 2 - 18}H44`} />
    </g>
  );
}

function Atomizador({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-30 -30H30V58C30 66 24 72 16 72H-16C-24 72 -30 66 -30 58Z" />
      <rect x="-14" y="-52" width="28" height="22" rx="2" />
      <path d="M-14 -52V-70H18L30 -64H38" />
      <path d="M30 -58L18 -52" />
      <path d="M-30 0H30" />
      <path d="M52 -74L78 -86M54 -64L84 -64M52 -54L78 -42" />
    </g>
  );
}

function Espejo({ x, y, giro = 0 }: { x: number; y: number; giro?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <ellipse cx="0" cy="-34" rx="44" ry="58" />
      <ellipse cx="0" cy="-34" rx="34" ry="47" />
      <path d="M-7 24V90C-7 96 7 96 7 90V24" />
      <path d="M-18 -62C-12 -72 -4 -76 4 -76" />
    </g>
  );
}

function Secador({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="-30" cy="-20" r="44" />
      <circle cx="-30" cy="-20" r="18" />
      <path d="M-10 -58H70V-22H-10" />
      <path d="M70 -62V-18" />
      <path d="M-44 22L-54 92H-24L-18 22" />
      <path d="M84 -52H104M84 -40H112M84 -28H104" />
    </g>
  );
}

function Pinza({ x, y, giro = 0 }: { x: number; y: number; giro?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <path d="M0 -70L-12 60L-4 64L4 -64" />
      <path d="M0 -70L12 60L4 64" />
      <path d="M-8 -20H8" />
    </g>
  );
}

function Brocha({ x, y, giro = 0 }: { x: number; y: number; giro?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <path d="M-6 0L-4 110H4L6 0" />
      <rect x="-9" y="-26" width="18" height="26" rx="2" />
      <path d="M-9 -26C-26 -46 -24 -80 0 -98C24 -80 26 -46 9 -26" />
      <path d="M0 -94V-30M-10 -76L-4 -32M10 -76L4 -32" />
    </g>
  );
}

function Libro({ x, y }: { x: number; y: number }) {
  const lineas = [];
  for (let i = 0; i < 5; i++) {
    lineas.push(<path key={`i${i}`} d={`M-84 ${-26 + i * 16}C-60 ${-32 + i * 16} -34 ${-32 + i * 16} -14 ${-24 + i * 16}`} />);
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -50C-30 -64 -70 -64 -100 -50V62C-70 48 -30 48 0 62Z" />
      <path d="M0 -50C30 -64 70 -64 100 -50V62C70 48 30 48 0 62Z" />
      {lineas}
      <path d={rizo(50, -44, 90, 12, 3.2)} />
    </g>
  );
}

function Lupa({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="46" />
      <path d="M33 33L84 84" strokeWidth="10" />
    </g>
  );
}

/** Mechas de muestra de color, en abanico. */
function Muestrario({ x, y, colores }: { x: number; y: number; colores: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {colores.map((c, i) => {
        const giro = -30 + i * (60 / Math.max(1, colores.length - 1));
        return (
          <g key={c + i} transform={`rotate(${giro}) translate(0 -8)`}>
            <path d="M-10 0H10L6 -118C6 -124 -6 -124 -6 -118Z" style={{ fill: c }} />
            <path d="M-10 0H10L6 -118C6 -124 -6 -124 -6 -118Z" />
          </g>
        );
      })}
      <circle cx="0" cy="-2" r="8" style={{ fill: "var(--ilu-fondo)" }} />
      <circle cx="0" cy="-2" r="8" />
    </g>
  );
}

/** Horquilla de peinar. */
function Horquilla({ x, y, giro = 0 }: { x: number; y: number; giro?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <path d="M-5 50V-40C-5 -52 5 -52 5 -40V-30C5 -24 -2 -20 -2 -14C-2 -8 5 -4 5 2V50" />
    </g>
  );
}

/** Mechón de hebras paralelas, el gesto del isotipo. */
function Mechon({
  x,
  y,
  n = 5,
  sep = 11,
  largo = 170,
  amp = 16,
  periodo = 70,
  creciente = false,
}: {
  x: number;
  y: number;
  n?: number;
  sep?: number;
  largo?: number;
  amp?: number;
  periodo?: number;
  creciente?: boolean;
}) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={onda(x + i * sep, y, largo, amp, periodo, { creciente })} />
      ))}
    </g>
  );
}

/** Nube de rizos: varias hebras en espiral juntas. */
function Rizos({ x, y, n = 6, sep = 22, largo = 160, radio = 12, vueltas = 5 }: {
  x: number;
  y: number;
  n?: number;
  sep?: number;
  largo?: number;
  radio?: number;
  vueltas?: number;
}) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={rizo(x + i * sep, y + (i % 2) * 10, largo - (i % 3) * 14, radio, vueltas - (i % 2) * 0.5, i)}
        />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Un dibujo por servicio                                                     */
/* -------------------------------------------------------------------------- */

type Dibujo = () => React.ReactNode;

const DIBUJOS: Record<string, Dibujo> = {
  // Asesorías
  valoracion: () => (
    <>
      <Rizos x={130} y={60} n={5} sep={20} largo={170} radio={11} vueltas={5} />
      <Lupa x={250} y={130} />
    </>
  ),
  asesoriaPeinados: () => (
    <>
      <Espejo x={160} y={140} giro={-12} />
      <path d={espiral(262, 118, 4, 42, 3.2)} />
      <Horquilla x={300} y={200} giro={28} />
      <Horquilla x={230} y={210} giro={-14} />
    </>
  ),
  asesoriaTransicion: () => (
    <>
      <Mechon x={130} y={50} n={7} sep={12} largo={200} amp={18} periodo={46} creciente />
      <Lupa x={266} y={120} />
    </>
  ),
  asesoriaColor: () => (
    <>
      <Muestrario
        x={190}
        y={230}
        colores={["var(--color-terra)", "var(--color-terra-soft)", "var(--color-terra-pale)", "var(--color-gold-500)", "var(--color-pink)"]}
      />
      <Lupa x={290} y={110} />
    </>
  ),
  disenoColor: () => (
    <>
      <Muestrario
        x={160}
        y={236}
        colores={["var(--color-wine-500)", "var(--color-terra)", "var(--color-terra-soft)", "var(--color-gold-500)"]}
      />
      <Brocha x={286} y={150} giro={24} />
    </>
  ),
  pruebaColor: () => (
    <>
      <Mechon x={140} y={40} n={5} sep={12} largo={200} amp={14} periodo={60} />
      <rect x="128" y="150" width="70" height="46" style={{ fill: "var(--color-terra)" }} />
      <rect x="128" y="150" width="70" height="46" />
      <Brocha x={290} y={120} giro={30} />
    </>
  ),

  // Cortes
  corteForma: () => (
    <>
      <Rizos x={112} y={50} n={6} sep={20} largo={180} radio={12} vueltas={5.5} />
      <Tijeras x={268} y={170} giro={-34} />
    </>
  ),
  cortePuntas: () => (
    <>
      <Mechon x={120} y={30} n={7} sep={11} largo={170} amp={10} periodo={60} />
      <path d="M104 218H232" strokeDasharray="6 8" />
      <Tijeras x={278} y={196} giro={-90} s={0.85} />
    </>
  ),
  corteLiso: () => (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${120 + i * 11} 40V${210 - (i % 2) * 6}`} />
      ))}
      <Peine x={112} y={100} giro={0} largo={100} />
      <Tijeras x={292} y={178} giro={-40} s={0.9} />
    </>
  ),
  corteTransicion: () => (
    <>
      <Mechon x={116} y={40} n={7} sep={12} largo={210} amp={16} periodo={40} creciente />
      <path d="M100 120H222" strokeDasharray="6 8" />
      <Tijeras x={290} y={170} giro={-80} s={0.85} />
    </>
  ),

  // Hidratación y definición
  citaSencilla: () => (
    <>
      <path d={gota(150, 120, 1.2)} />
      <path d={gota(208, 176, 0.7)} />
      <Peine x={200} y={96} giro={28} largo={140} />
    </>
  ),
  celulasMadre: () => (
    <>
      <Gotero x={170} y={170} />
      <path d={gota(170, 256, 0.35)} />
      <circle cx="270" cy="110" r="30" />
      <circle cx="270" cy="110" r="11" />
      <circle cx="306" cy="172" r="20" />
      <circle cx="306" cy="172" r="7" />
      <circle cx="252" cy="196" r="14" />
      <circle cx="252" cy="196" r="5" />
    </>
  ),
  reconstruccion: () => (
    <>
      <Mechon x={110} y={40} n={5} sep={13} largo={210} amp={14} periodo={70} />
      <path d="M100 110H172M100 124H172M100 176H172M100 190H172" />
      <Frasco x={270} y={160} alto={120} />
    </>
  ),
  revitalizacion: () => (
    <>
      <Atomizador x={180} y={150} />
      <Rizos x={262} y={80} n={3} sep={22} largo={150} radio={11} vueltas={5} />
    </>
  ),

  // Transformación y transición
  transformacion: () => (
    <>
      <Rizos x={116} y={50} n={7} sep={25} largo={190} radio={12} vueltas={5.5} />
      <path d="M100 262H300" />
    </>
  ),
  transformacionTransicion: () => (
    <>
      <Mechon x={90} y={40} n={5} sep={12} largo={200} amp={16} periodo={42} creciente />
      <Rizos x={196} y={44} n={5} sep={21} largo={190} radio={12} vueltas={6} />
    </>
  ),
  celulasMadreCorte: () => (
    <>
      <Gotero x={150} y={170} />
      <Tijeras x={272} y={168} giro={-30} s={0.9} />
    </>
  ),

  // Peinados y otros
  peinado: () => (
    <>
      <path d={espiral(200, 118, 6, 62, 3.6)} />
      <path d="M128 196C150 176 250 176 272 196" />
      <path d="M136 214C158 196 242 196 264 214" />
      <Horquilla x={270} y={100} giro={38} />
      <Horquilla x={130} y={100} giro={-38} />
    </>
  ),
  blower: () => (
    <>
      <Secador x={170} y={140} />
      <Mechon x={292} y={70} n={3} sep={12} largo={170} amp={9} periodo={80} />
    </>
  ),
  cejas: () => (
    <>
      <path d="M96 150C140 106 220 98 272 122" strokeWidth="5" />
      {Array.from({ length: 14 }, (_, i) => {
        const x = 110 + i * 11;
        const y = 138 - Math.sin((i / 13) * Math.PI) * 26 - i * 0.6;
        return <path key={i} d={`M${x} ${y + 10}L${x + 7} ${y - 6}`} />;
      })}
      <Pinza x={300} y={196} giro={-28} />
    </>
  ),
  bozo: () => (
    <>
      <path d="M110 186C140 164 170 160 200 172C230 160 260 164 290 186C260 210 230 222 200 222C170 222 140 210 110 186Z" />
      <path d="M110 186C150 192 250 192 290 186" />
      <path d="M120 130C170 118 230 118 280 130" strokeDasharray="2 9" />
      <Pinza x={300} y={96} giro={60} />
    </>
  ),
  maquillaje: () => (
    <>
      <circle cx="160" cy="150" r="62" />
      <circle cx="160" cy="150" r="46" style={{ fill: "var(--color-terra-pale)" }} />
      <circle cx="160" cy="150" r="46" />
      <Brocha x={270} y={150} giro={18} />
    </>
  ),
  boda: () => (
    <>
      <circle cx="176" cy="160" r="46" />
      <circle cx="232" cy="160" r="46" />
      <path d="M160 108L176 92L192 108L176 124Z" />
      <path d={espiral(300, 86, 3, 24, 2.4)} />
    </>
  ),
  curso: () => <Libro x={200} y={150} />,
};

/** Reglas nombre → dibujo. La primera que calza gana: el orden importa. */
const REGLAS: [RegExp, keyof typeof DIBUJOS][] = [
  [/transformaci[oó]n.*transici[oó]n/i, "transformacionTransicion"],
  [/c[eé]lulas madre.*corte/i, "celulasMadreCorte"],
  [/corte.*transici[oó]n/i, "corteTransicion"],
  [/asesor[ií]a.*transici[oó]n|transici[oó]n/i, "asesoriaTransicion"],
  [/asesor[ií]a.*peinad/i, "asesoriaPeinados"],
  [/dise[nñ]o de color|balayage|iluminaci/i, "disenoColor"],
  [/prueba de color/i, "pruebaColor"],
  [/color/i, "asesoriaColor"],
  [/transformaci[oó]n/i, "transformacion"],
  [/corte de puntas|puntas/i, "cortePuntas"],
  [/lasio|lacio|liso/i, "corteLiso"],
  [/corte/i, "corteForma"],
  [/c[eé]lulas madre/i, "celulasMadre"],
  [/reconstrucci[oó]n|reparaci[oó]n/i, "reconstruccion"],
  [/revitalizaci[oó]n/i, "revitalizacion"],
  [/peinad|recogid/i, "peinado"],
  [/cita sencilla|lavado|hidrataci[oó]n|definici[oó]n/i, "citaSencilla"],
  [/blower|secad|brushing/i, "blower"],
  [/ceja/i, "cejas"],
  [/bozo|depilaci/i, "bozo"],
  [/boda|novia/i, "boda"],
  [/maquillaje/i, "maquillaje"],
  [/curso|taller|autocuidado/i, "curso"],
  [/asesor[ií]a|valoraci[oó]n|diagn[oó]stico/i, "valoracion"],
];

export function dibujoDeServicio(nombre: string): keyof typeof DIBUJOS {
  return REGLAS.find(([re]) => re.test(nombre))?.[1] ?? "valoracion";
}

/** Fondo y círculo de acento por categoría: bloques planos de la paleta. */
const COLORES: [RegExp, { fondo: string; acento: string }][] = [
  [/asesor/i, { fondo: "var(--color-sky-pale)", acento: "var(--color-sky-soft)" }],
  [/corte y definici/i, { fondo: "var(--color-gold-200)", acento: "var(--color-pink-soft)" }],
  [/corte/i, { fondo: "var(--color-gold-200)", acento: "var(--color-gold-500)" }],
  [/hidrataci|definici/i, { fondo: "var(--color-pink-soft)", acento: "var(--color-pink)" }],
  [/transici/i, { fondo: "var(--color-terra-pale)", acento: "var(--color-terra-soft)" }],
  [/peinad/i, { fondo: "var(--color-sky-soft)", acento: "var(--color-sky)" }],
  [/color/i, { fondo: "var(--color-pink-pale)", acento: "var(--color-terra-pale)" }],
  [/curso/i, { fondo: "var(--color-gold-100)", acento: "var(--color-sky-soft)" }],
];
const COLOR_BASE = { fondo: "var(--color-cream)", acento: "var(--color-pink-soft)" };

/** Posiciones del círculo de acento, para que no todos los dibujos se vean iguales. */
const CIRCULOS = [
  { cx: 250, cy: 130, r: 96 },
  { cx: 150, cy: 170, r: 90 },
  { cx: 280, cy: 190, r: 80 },
  { cx: 200, cy: 150, r: 110 },
];

function hash(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function IlustracionServicio({
  nombre,
  categoria,
  className = "",
}: {
  nombre: string;
  categoria?: string | null;
  className?: string;
}) {
  const clave = dibujoDeServicio(nombre);
  const { fondo, acento } =
    COLORES.find(([re]) => re.test(categoria ?? nombre))?.[1] ?? COLOR_BASE;
  const circulo = CIRCULOS[hash(clave) % CIRCULOS.length];

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Ilustración: ${nombre}`}
      className={`block h-full w-full ${className}`}
      style={{ backgroundColor: fondo, ["--ilu-fondo" as string]: fondo }}
    >
      <circle cx={circulo.cx} cy={circulo.cy} r={circulo.r} style={{ fill: acento }} />
      <g
        fill="none"
        stroke={VINO}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {DIBUJOS[clave]()}
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Tipos de rizo (formulario de reserva)                                      */
/* -------------------------------------------------------------------------- */

const RIZOS: Record<string, { fondo: string; dibujo: () => React.ReactNode }> = {
  ONDULADO: {
    fondo: "var(--color-sky-pale)",
    dibujo: () =>
      Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={onda(62 + i * 19, 24, 152, 11, 92, { fase: i * 0.2 })} />
      )),
  },
  RIZADO: {
    fondo: "var(--color-pink-soft)",
    dibujo: () =>
      Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={rizo(58 + i * 28, 28 + (i % 2) * 8, 140, 11, 4.5, i)} />
      )),
  },
  CRESPO: {
    fondo: "var(--color-terra-pale)",
    dibujo: () =>
      Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={rizo(52 + i * 24, 30 + (i % 2) * 6, 134, 8, 9, i)} />
      )),
  },
  NO_SE: {
    fondo: "var(--color-gold-200)",
    dibujo: () => (
      <>
        <path d={onda(62, 30, 140, 9, 90)} />
        <path d={rizo(100, 30, 140, 10, 4.5)} />
        <path d={rizo(140, 30, 140, 7, 9)} />
      </>
    ),
  },
};

/** Dibujo de un tipo de rizo: ondulado, rizado, crespo o "no sé". */
export function IlustracionRizo({ tipo, className = "" }: { tipo: string; className?: string }) {
  const r = RIZOS[tipo] ?? RIZOS.NO_SE;
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
      style={{ backgroundColor: r.fondo }}
    >
      <g fill="none" stroke={VINO} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {r.dibujo()}
      </g>
    </svg>
  );
}
