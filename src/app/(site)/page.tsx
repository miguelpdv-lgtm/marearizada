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
      <section className="lp-section" id="servicios">
        <div className="mr-wrap">
          <div className="lp-head">
            <span className="mr-eyebrow">Servicios</span>
            <h2>Salud primero, definición después</h2>
            <p>Trabajamos el rizo desde dentro: cuero cabelludo, hidratación y forma. El resultado bonito es la consecuencia.</p>
          </div>
          <div className="lp-tiles">
            <article className="mr-tile">
              <div className="mr-photo"><img src="/landing/diagnostico.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <div className="mr-tile__body"><span className="mr-tile__n">01</span><h3>Diagnóstico capilar</h3><p>El punto de partida: patrón, porosidad, cuero cabelludo y un plan por etapas.</p></div>
            </article>
            <article className="mr-tile">
              <div className="mr-photo"><img src="/landing/corte.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <div className="mr-tile__body"><span className="mr-tile__n">02</span><h3>Corte rizo a rizo</h3><p>Corte en seco, mechón a mechón, respetando cómo cae cada rizo.</p></div>
            </article>
            <article className="mr-tile">
              <div className="mr-photo"><img src="/landing/tratamiento.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <div className="mr-tile__body"><span className="mr-tile__n">03</span><h3>Tratamientos de recuperación</h3><p>Hidratación, nutrición o proteína según lo que pida tu fibra.</p></div>
            </article>
            <article className="mr-tile">
              <div className="mr-photo"><img src="/landing/nails.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <div className="mr-tile__body"><span className="mr-tile__n">04 · Para casa</span><h3>Asesoría curly</h3><p>Tu rutina paso a paso, con productos que sí funcionan para ti.</p></div>
            </article>
          </div>
        </div>
      </section>

      <div className="mr-reel lp-reel" aria-hidden="true">
        <div className="mr-reel__track">
          {[0, 1].flatMap((k) => ["rizo-corto", "manos", "corte", "manicure", "diagnostico", "tratamiento"].map((n) => (
            <div key={`${k}-${n}`} className="mr-photo"><img src={`/landing/${n}.jpg`} alt="" loading="lazy" /></div>
          )))}
        </div>
      </div>

      {/* Método */}
      <section className="lp-section" id="metodo">
        <div className="mr-wrap lp-method">
          <div className="mr-photo mr-photo--concha"><img src="/landing/metodo.jpg" alt="Mujer de perfil con rizos definidos sobre la ciudad al atardecer" loading="lazy" /></div>
          <div>
            <div className="lp-head" style={{ marginBottom: "var(--sp-6)" }}>
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
        <div className="lp-manifesto__bg" aria-hidden="true"><img src="/landing/manifiesto.jpg" alt="" loading="lazy" /></div>
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
              <div className="mr-photo"><img src="/landing/salon.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <svg aria-hidden="true"><use href="#mr-mark" /></svg>
              <b>Marea Rizada</b>
              <p>Salud capilar, diagnóstico, corte y tratamientos para rizos.</p>
              <span>@marea.rizada →</span>
            </a>
            <a className="lp-fam lp-fam--shop" href="https://instagram.com/marearizada_shop" target="_blank" rel="noopener noreferrer">
              <div className="mr-photo"><img src="/landing/shop.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <svg aria-hidden="true"><use href="#mr-mark" /></svg>
              <b>Marea Rizada Shop</b>
              <p>Los productos que usamos en el salón, para tu rutina en casa.</p>
              <span>@marearizada_shop →</span>
            </a>
            <a className="lp-fam lp-fam--nails" href="https://instagram.com/marea.rizada_nails" target="_blank" rel="noopener noreferrer">
              <div className="mr-photo"><img src="/landing/manos.jpg" alt="" loading="lazy" /><span className="mr-scrim" /></div>
              <svg aria-hidden="true"><use href="#mr-mark" /></svg>
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
