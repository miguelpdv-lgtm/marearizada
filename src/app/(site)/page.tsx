import type { CSSProperties } from "react";

import { prisma } from "@/lib/db";
import { bookingTarget, getSettings } from "@/lib/site";

export const revalidate = 300;

/**
 * Portada. Es la landing aprobada (la misma de GitHub Pages) pasada a JSX;
 * las olas, la franja de patrones, el buscador de patrón y el antes/después
 * los activa <MareaVivo /> desde el layout.
 */
export default async function Portada() {
  const settings = await getSettings();
  const booking = bookingTarget(settings);
  const reservar = booking.href;
  const diag = booking.external
    ? null
    : await prisma.service.findFirst({
        where: { slug: "diagnostico-capilar", active: true, bookable: true },
        select: { id: true },
      });
  const diagnostico = diag ? `/reservar?servicio=${diag.id}` : reservar;
  const resenas = await prisma.testimonial.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    take: 6,
    select: { id: true, clientName: true, quote: true, rating: true, serviceName: true },
  });

  return (
    <>
      {/* Héroe */}
      <section className="lp-hero" id="inicio">
        <div className="lp-hero__right">
          <img src="/assets/fachada.jpg" alt="Fachada del salón Marea Rizada: letrero con el logo sobre la pared verde y, al lado, un mural de una mujer con el pelo rizado y gafas blancas" width="964" height="672" fetchPriority="high" />
        </div>
        <div className="lp-hero__left" aria-hidden="true"></div>
        <span className="lp-hero__foam" aria-hidden="true"></span>
        <div className="lp-hero__copy mr-rise">
          <span className="mr-eyebrow">Salón especializado en rizos</span>
          <h1>Recuperamos tus rizos</h1>
          <p className="lp-hero__lead">Diagnóstico, corte rizo a rizo y rutinas para cada patrón, del 2A al 4C.</p>
          <div className="lp-hero__ctas">
            <a className="mr-btn mr-btn--light" href="#patron">Tu patrón</a>
          </div>
        </div>
        <div className="lp-hero__sea"><canvas id="hero-tide" aria-hidden="true" /></div>
      </section>

      <section aria-label="Patrones de rizo">
        <div className="lp-band" aria-label="Patrones de rizo del 2A al 4C">
          <div className="lp-band__track" id="band"></div>
        </div>
      </section>

      {/* Descubre tu patrón */}
      <section className="lp-section" id="patron">
        <div className="mr-wrap">
          <div className="lp-head">
            <span className="mr-eyebrow">Descubre tu patrón</span>
            <h2>Cada rizo tiene su marea</h2>
            <p>Elige la forma que más se parece a tu pelo recién lavado y sin peinar. Te contamos qué necesita. En el diagnóstico lo confirmamos mechón a mechón: es habitual tener dos o tres patrones en la misma cabeza.</p>
          </div>
          <div className="lp-finder">
            <div className="lp-finder__grid" id="finder" role="group" aria-label="Elige tu patrón"></div>
            <article className="lp-result" id="result" aria-live="polite">
              <div className="lp-result__main">
                <div>
                  <div className="lp-result__code" id="r-code">3B</div>
                  <h3 className="lp-result__name" id="r-name">Rizo definido</h3>
                </div>
                <p id="r-text">Rizos del grosor de un rotulador, con mucho volumen. Pierden forma cuando les falta agua: necesitan hidratación profunda, sellado con crema o aceite ligero y poca manipulación.</p>
                <div className="lp-needs">
                  <div className="lp-need"><span>Hidratación</span><span className="lp-need__bar" id="n-hid"></span></div>
                  <div className="lp-need"><span>Definición</span><span className="lp-need__bar" id="n-def"></span></div>
                  <div className="lp-need"><span>Cuidado nocturno</span><span className="lp-need__bar" id="n-noc"></span></div>
                </div>
              </div>
              <div className="mr-tide-loader" id="r-tide" style={{"--level": "70%"} as CSSProperties}><span id="r-tide-out">sed</span></div>
              <svg className="lp-result__curve" viewBox="0 0 600 70" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path id="r-curve" d="" /></svg>
              <a className="mr-btn" href={diagnostico} style={{ justifySelf: "start" }}>Confirmar mi patrón en un diagnóstico</a>
            </article>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="lp-section lp-section--tint" id="servicios">
        <div className="mr-wrap">
          <div className="lp-head">
            <span className="mr-eyebrow">Servicios</span>
            <h2>Salud primero, definición después</h2>
            <p>Trabajamos el rizo desde dentro: cuero cabelludo, hidratación y forma. El resultado bonito es la consecuencia.</p>
          </div>
          <div className="lp-services">
            <article className="mr-card">
              <div className="mr-card__icon"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="15" cy="15" r="9" /><path d="M22 22l8 8M10 16c2-3 4-3 5 0s3 3 5 0" /></svg></div>
              <h3>Diagnóstico capilar</h3>
              <p>El punto de partida. Analizamos tu historia con el pelo y cómo está hoy.</p>
              <ul><li>Patrón y porosidad</li><li>Estado del cuero cabelludo</li><li>Plan por etapas</li></ul>
            </article>
            <article className="mr-card">
              <div className="mr-card__icon"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="26" r="4" /><circle cx="21" cy="28" r="4" /><path d="M12 23L26 6M18 25L11 8" /><path d="M26 18c2-2 4-2 5 0" /></svg></div>
              <h3>Corte rizo a rizo</h3>
              <p>Corte en seco, mechón a mechón, respetando cómo cae cada rizo.</p>
              <ul><li>Forma y volumen equilibrados</li><li>Saneado de puntas dañadas</li><li>Ideal en transición</li></ul>
            </article>
            <article className="mr-card">
              <div className="mr-card__icon"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 4C12 12 9 17 9 22a9 9 0 0 0 18 0c0-5-3-10-9-18z" /><path d="M12 23c2-2 4-2 6 0s4 2 6 0" /></svg></div>
              <h3>Tratamientos de recuperación</h3>
              <p>Hidratación, nutrición o proteína según lo que pida tu fibra.</p>
              <ul><li>Adaptados a tu porosidad</li><li>Elasticidad y brillo</li><li>Menos frizz, más forma</li></ul>
            </article>
            <article className="mr-card mr-card--feature">
              <div className="mr-card__icon"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8h24v15H16l-6 6v-6H6z" /><path d="M18 11a3.5 3.5 0 1 0 3.5 3.5" /></svg></div>
              <span className="mr-badge">Para casa</span>
              <h3>Asesoría curly</h3>
              <p>Tu rutina paso a paso: lavado, definición y secado, con productos que sí funcionan para ti.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Método */}
      <section className="lp-section" id="metodo">
        <div className="mr-wrap">
          <div className="lp-head">
            <span className="mr-eyebrow">El método</span>
            <h2>La marea sube poco a poco</h2>
            <p>Recuperar un rizo lleva semanas, no una tarde. Por eso trabajamos por etapas y te acompañamos entre citas.</p>
          </div>
          <ol className="lp-steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li className="lp-step"><div className="mr-tide-loader" style={{"--level": "22%"} as CSSProperties}></div><span className="lp-step__n">Paso 1</span><h3>Diagnóstico</h3><p>Leemos tu pelo: patrón, porosidad, daño químico o térmico y hábitos.</p></li>
            <li className="lp-step"><div className="mr-tide-loader" style={{"--level": "46%"} as CSSProperties}></div><span className="lp-step__n">Paso 2</span><h3>Limpieza y corte</h3><p>Liberamos el rizo de residuos y cortamos lo que ya no puede volver.</p></li>
            <li className="lp-step"><div className="mr-tide-loader" style={{"--level": "70%"} as CSSProperties}></div><span className="lp-step__n">Paso 3</span><h3>Hidratación y rutina</h3><p>Tratamiento en salón y una rutina clara para casa.</p></li>
            <li className="lp-step"><div className="mr-tide-loader" style={{"--level": "92%"} as CSSProperties}></div><span className="lp-step__n">Paso 4</span><h3>Seguimiento</h3><p>Revisamos cómo responde tu rizo y ajustamos productos y técnica.</p></li>
          </ol>
        </div>
      </section>

      {/* Resultados */}
      <section className="lp-section lp-section--sand" id="resultados">
        <div className="mr-wrap lp-results">
          <div className="mr-ba" id="ba" aria-label="Ilustración antes y después">
            <canvas id="ba-before" aria-hidden="true" />
            <div className="mr-ba__after"><canvas id="ba-after" aria-hidden="true" /></div>
            <span className="mr-ba__line"></span>
            <span className="mr-badge mr-ba__tag mr-ba__tag--l">Antes · encrespado</span>
            <span className="mr-badge mr-badge--aqua mr-ba__tag mr-ba__tag--r">Después · definido</span>
            <input type="range" id="ba-range" min="0" max="100" defaultValue="50" aria-label="Mover comparador" />
            <span className="mr-ba__knob"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg></span>
          </div>
          <div className="lp-results__copy">
            <span className="mr-eyebrow">Transición</span>
            <h2>Del encrespado a la definición</h2>
            <p>El frizz casi siempre es sed. Cuando el rizo recupera agua y deja de recibir calor y químicos, vuelve a agruparse y a marcar su forma.</p>
            <ul className="lp-checks">
              <li><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17c3-3 6-3 9 0s6 3 9 0M9 10l3 3 7-7" /></svg>Rizos que se agrupan en vez de abrirse</li>
              <li><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17c3-3 6-3 9 0s6 3 9 0M9 10l3 3 7-7" /></svg>Elasticidad: se estira y vuelve</li>
              <li><svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17c3-3 6-3 9 0s6 3 9 0M9 10l3 3 7-7" /></svg>Una rutina que entiendes y puedes repetir</li>
            </ul>
            <a className="mr-btn mr-btn--secondary" href="https://instagram.com/marea.rizada" target="_blank" rel="noopener noreferrer" style={{ justifySelf: "start" }}>Ver resultados reales en Instagram</a>
          </div>
        </div>
      </section>

      {resenas.length > 0 && (
        <section className="lp-section" id="resenas">
          <div className="mr-wrap">
            <div className="lp-head">
              <span className="mr-eyebrow">Reseñas</span>
              <h2>Lo que cuentan nuestras clientas</h2>
            </div>
            <div className="lp-reviews">
              {resenas.map((r) => (
                <figure key={r.id} className="mr-card lp-review">
                  <span className="lp-review__stars" aria-label={`${r.rating} de 5`}>
                    {"★".repeat(r.rating)}
                  </span>
                  <blockquote>“{r.quote}”</blockquote>
                  <figcaption>
                    <b>{r.clientName}</b>
                    {r.serviceName && <span> · {r.serviceName}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Manifiesto */}
      <section className="lp-manifesto" aria-label="Manifiesto">
        <div className="mr-wrap">
          <span className="mr-eyebrow">Por qué Marea Rizada</span>
          <p>Ningún rizo es difícil. Ninguno hay que domarlo. Cada uno tiene su ritmo, como la marea: sube, baja y siempre vuelve.</p>
        </div>
        <div className="lp-manifesto__sea"><canvas id="sea-tide" aria-hidden="true" /></div>
      </section>

      {/* Familia */}
      <section className="lp-section" id="familia">
        <div className="mr-wrap">
          <div className="lp-head">
            <span className="mr-eyebrow">La familia Marea</span>
            <h2>Salón, shop y nails</h2>
          </div>
          <div className="lp-family">
            <a className="lp-fam lp-fam--salon" href="https://instagram.com/marea.rizada" target="_blank" rel="noopener noreferrer">
              <svg aria-hidden="true"><use href="#mr-mark" /></svg>
              <b>Marea Rizada</b>
              <p>Salud capilar, diagnóstico, corte y tratamientos para rizos.</p>
              <span>@marea.rizada →</span>
            </a>
            <a className="lp-fam lp-fam--shop" href="https://instagram.com/marearizada_shop" target="_blank" rel="noopener noreferrer">
              <svg aria-hidden="true" style={{"--mark-sand": "#9EE5E7", "--mark-water": "#F3E3DC", "--mark-water2": "#E6CCC1", "--mark-foam": "#9A5B49"} as CSSProperties}><use href="#mr-mark" /></svg>
              <b>Marea Rizada Shop</b>
              <p>Los productos que usamos en el salón, para tu rutina en casa.</p>
              <span>@marearizada_shop →</span>
            </a>
            <a className="lp-fam lp-fam--nails" href="https://instagram.com/marea.rizada_nails" target="_blank" rel="noopener noreferrer">
              <svg aria-hidden="true" style={{"--mark-sand": "#F3E3DC", "--mark-water": "#CDAA9C", "--mark-water2": "#E6CCC1"} as CSSProperties}><use href="#mr-mark" /></svg>
              <b>Marea Rizada Nails</b>
              <p>Manicura con el mismo cuidado y la misma calma.</p>
              <span>@marea.rizada_nails →</span>
            </a>
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section className="lp-section lp-section--tint" id="preguntas">
        <div className="mr-wrap">
          <div className="lp-head lp-head--center">
            <span className="mr-eyebrow">Preguntas frecuentes</span>
            <h2>Antes de tu primera cita</h2>
          </div>
          <div className="lp-faq">
            <details open>
              <summary>No sé cuál es mi patrón. ¿Pasa algo?</summary>
              <p>Nada. Para eso está el diagnóstico. Además, casi nadie tiene un solo patrón: la nuca, la coronilla y los laterales suelen rizar distinto.</p>
            </details>
            <details>
              <summary>Llevo años alisándome. ¿Puedo recuperar el rizo?</summary>
              <p>En la mayoría de los casos, sí. El pelo nuevo crece con su forma natural; lo que hacemos es cuidar la transición y cortar el largo dañado al ritmo que tú quieras.</p>
            </details>
            <details>
              <summary>¿Cuánto tarda en notarse el cambio?</summary>
              <p>Depende del daño y de la constancia. Muchas personas notan más definición e hidratación en las primeras semanas; la recuperación completa lleva más tiempo, porque va al ritmo del crecimiento.</p>
            </details>
            <details>
              <summary>¿Cómo reservo?</summary>
              <p>En línea, cuando quieras: eliges el servicio, la profesional, el día y la hora. La confirmación te llega al correo y desde ahí mismo puedes cambiar la cita si se te cruza algo.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="lp-section" id="reservar">
        <div className="mr-wrap lp-cta">
          <svg className="lp-cta__mark" aria-hidden="true"><use href="#mr-mark" /></svg>
          <h2>Tu rizo está esperando su marea</h2>
          <p>Empieza por un diagnóstico. Sin prisas y sin promesas de milagro: con un plan.</p>
          <a className="mr-btn" href={reservar}>Agendar mi cita</a>
          <span className="lp-handle">@marea.rizada</span>
        </div>
      </section>
    </>
  );
}
