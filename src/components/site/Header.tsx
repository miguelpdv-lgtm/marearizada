/**
 * Sprite del isotipo y cabecera del sitio público. Es la misma de la landing:
 * marca a la izquierda, enlaces a las secciones de la portada y el botón de
 * reservar. Los enlaces son <a> normales para que la portada cargue completa
 * (y con ella sus olas y la intro).
 */
export function SpriteMarca() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="mr-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
        <symbol id="mr-mark" viewBox="0 0 100 100">
          <g clipPath="url(#mr-clip)">
            <rect width="100" height="100" fill="var(--mark-sand, #CDAA9C)" />
            <path d="M57 26q2.8-2.8 5.6 0q2.8-2.8 5.6 0M69 18q2-2 4 0q2-2 4 0" fill="none" stroke="var(--mark-foam, #FFFFFF)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 66C12 60 22 58 34 62S56 58 70 56 92 60 100 60V100H0Z" fill="var(--mark-water2, #BDEEEF)" />
            <path d="M0 60C10 58 18 50 30 50S43 61 52 61 63 48 73 48 88 58 100 57V100H0Z" fill="var(--mark-water, #9EE5E7)" />
            <g fill="none" stroke="var(--mark-foam, #FFFFFF)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 60C10 58 18 50 30 50" />
              <path d="M30 50A8 8 0 0 0 22 58A7 7 0 0 0 29 65A5.5 5.5 0 0 0 34.5 59.5A3.8 3.8 0 0 0 30.7 55.7A2.4 2.4 0 0 0 28.3 58.1" />
              <path d="M37 53C41 58 45 61 52 61S63 48 73 48" />
              <path d="M73 48A8 8 0 0 0 65 56A7 7 0 0 0 72 63A5.5 5.5 0 0 0 77.5 57.5A3.8 3.8 0 0 0 73.7 53.7A2.4 2.4 0 0 0 71.3 56.1" />
              <path d="M80 50.5C86 53 92 57 100 57" />
              <path d="M4 79C12 74 18 74 25 78S38 83 46 78 58 73 66 78 79 83 87 78 97 74 100 75" strokeWidth="2.3" opacity=".9" />
              <path d="M14 90C20 87 26 87 31 90S42 93 48 90" strokeWidth="2" opacity=".75" />
            </g>
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

const SECCIONES = [
  { label: "Tu patrón", hash: "patron" },
  { label: "Servicios", hash: "servicios" },
  { label: "Método", hash: "metodo" },
  { label: "Shop y Nails", hash: "familia" },
  { label: "Preguntas", hash: "preguntas" },
];

export function Header({
  bookingHref,
  bookingExternal,
}: {
  bookingHref: string;
  bookingExternal: boolean;
}) {
  // "/#x" en la portada solo hace scroll; desde otra página lleva a la portada.
  return (
    <header className="lp-header">
      <div className="mr-wrap">
        <nav className="mr-nav" aria-label="Principal">
          {/* <a> a propósito: la portada carga completa con su intro y sus olas. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="lp-brand" href="/#inicio" aria-label="Marea Rizada, inicio">
            <svg aria-hidden="true">
              <use href="#mr-mark" />
            </svg>
            <b>Marea Rizada</b>
          </a>
          <div className="mr-nav__links">
            {SECCIONES.map((s) => (
              <a key={s.hash} href={`/#${s.hash}`}>
                {s.label}
              </a>
            ))}
          </div>
          <a
            className="mr-btn mr-btn--sm"
            href={bookingHref}
            {...(bookingExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            Reservar
          </a>
        </nav>
      </div>
    </header>
  );
}
