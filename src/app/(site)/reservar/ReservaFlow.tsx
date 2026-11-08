"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";

import { Isotipo } from "@/components/brand/Marca";
import { formatCOP, whatsappLink } from "@/lib/format";
import {
  crearReserva,
  obtenerDiasConCupo,
  obtenerHoras,
  proximoCupo,
  revisarCupon,
  type ResultadoCupon,
  type ResultadoReserva,
} from "./actions";
import { etiquetaFecha, hora12 } from "./fechas";
import { MareaFinal, SelloMarea } from "./MareaFinal";
import { OfertaAbono } from "./OfertaAbono";
import "./reserva.css";

export type Servicio = {
  id: string;
  name: string;
  tagline: string | null;
  durationMin: number;
  price: number;
  hidePrice: boolean;
  /** Promoción automática vigente, si la hay. */
  promo: { etiqueta: string; precioFinal: number } | null;
};

export type Linea = {
  id: string;
  name: string;
  description: string | null;
  variante: "salon" | "nails";
  /** Rizos pide el patrón; Nails no. */
  pidePatron: boolean;
  servicios: Servicio[];
};

export type Profesional = {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string | null;
  servicios: string[];
};

type Sede = { id: string; name: string; address: string; whatsapp: string | null };

const PASOS = 5;
/** "" = cualquiera disponible. */
const CUALQUIERA = "";

const PATRONES = [
  { valor: "NO_SE", label: "No lo sé" },
  { valor: "ONDULADO", label: "Ondulado (2A a 2C)" },
  { valor: "RIZADO", label: "Rizado (3A a 3C)" },
  { valor: "CRESPO", label: "Afro o coily (4A a 4C)" },
] as const;

const DIAS_VISIBLES = 21;

/** "2026-11-10" → { corto: "lun", numero: 10 } en hora local del día. */
function partesDia(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return { corto: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][dt.getUTCDay()], numero: d };
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function ReservaFlow({
  hoy,
  maxDias,
  sede,
  lineas,
  equipo,
  servicioInicial,
  hayCupones = false,
}: {
  hoy: string;
  maxDias: number;
  sede: Sede;
  lineas: Linea[];
  equipo: Profesional[];
  servicioInicial?: string;
  hayCupones?: boolean;
}) {
  const inicial = servicioInicial
    ? lineas.find((l) => l.servicios.some((s) => s.id === servicioInicial))
    : lineas.length === 1
      ? lineas[0]
      : undefined;

  const [paso, setPaso] = useState(inicial ? (servicioInicial ? 3 : 2) : 1);
  const [direccion, setDireccion] = useState<"next" | "prev">("next");
  const [lineaId, setLineaId] = useState<string | null>(inicial?.id ?? null);
  const [serviceId, setServiceId] = useState<string | null>(servicioInicial && inicial ? servicioInicial : null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [dias, setDias] = useState<Record<string, number> | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [horas, setHoras] = useState<string[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [proximos, setProximos] = useState<Record<string, { fecha: string; hora: string } | null>>({});
  const [datos, setDatos] = useState({ nombre: "", celular: "", correo: "", patron: "NO_SE", notas: "", primera: false });
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [resultado, setResultado] = useState<Extract<ResultadoReserva, { ok: true }> | null>(null);
  const [enviando, enviar] = useTransition();
  const [cupon, setCupon] = useState({ abierto: false, texto: "" });
  const [cuponOk, setCuponOk] = useState<Extract<ResultadoCupon, { ok: true }> | null>(null);
  const [cuponError, setCuponError] = useState<string | null>(null);
  const [revisando, revisar] = useTransition();
  const ocupado = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  const linea = lineas.find((l) => l.id === lineaId) ?? null;
  const servicio = linea?.servicios.find((s) => s.id === serviceId) ?? null;
  const profesionales = servicio ? equipo.filter((p) => p.servicios.includes(servicio.id)) : [];
  const profesional = staffId ? equipo.find((p) => p.id === staffId) ?? null : null;
  const maxConsulta = Math.min(DIAS_VISIBLES, maxDias);

  const ir = useCallback((n: number, dir: "next" | "prev") => {
    setDireccion(dir);
    setPaso(n);
    setError(null);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  // Al cambiar de pantalla el foco va al título (lectores de pantalla); no al cargar.
  const primeraPantalla = useRef(true);
  useEffect(() => {
    if (primeraPantalla.current) {
      primeraPantalla.current = false;
      return;
    }
    titulo.current?.focus({ preventScroll: true });
  }, [paso]);

  /** Marca la elección un instante y pasa sola a la siguiente pantalla. */
  const elegir = (aplicar: () => void, siguiente: number) => {
    if (ocupado.current) return;
    ocupado.current = true;
    aplicar();
    window.setTimeout(() => {
      ocupado.current = false;
      ir(siguiente, "next");
    }, 300);
  };

  // Próximo cupo de cada profesional, para su tarjeta.
  useEffect(() => {
    if (paso !== 3 || !servicio) return;
    let vivo = true;
    Promise.all(
      profesionales.map(async (p) => [p.id, await proximoCupo(sede.id, servicio.id, p.id, hoy)] as const),
    ).then((pares) => vivo && setProximos(Object.fromEntries(pares)));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, servicio?.id]);

  // Días con cupo para la elección actual.
  useEffect(() => {
    if (paso !== 4 || !servicio || staffId === null) return;
    let vivo = true;
    setDias(null);
    obtenerDiasConCupo(sede.id, servicio.id, hoy, maxConsulta, staffId || null).then((r) => {
      if (!vivo) return;
      setDias(r);
      setDia((actual) => (actual && r[actual] > 0 ? actual : Object.keys(r).sort().find((f) => r[f] > 0) ?? null));
    });
    return () => {
      vivo = false;
    };
  }, [paso, servicio, staffId, sede.id, hoy, maxConsulta]);

  // Horas del día elegido.
  useEffect(() => {
    if (paso !== 4 || !servicio || !dia || staffId === null) return;
    let vivo = true;
    setHoras(null);
    obtenerHoras(sede.id, servicio.id, dia, staffId || null).then((r) => vivo && setHoras(r));
    return () => {
      vivo = false;
    };
  }, [paso, servicio, dia, staffId, sede.id]);

  const reservar = (e: FormEvent) => {
    e.preventDefault();
    if (!servicio || !dia || !hora || staffId === null) return;
    setError(null);
    enviar(async () => {
      const r = await crearReserva({
        branchId: sede.id,
        serviceId: servicio.id,
        staffId: staffId || undefined,
        fecha: dia,
        hora,
        clientName: datos.nombre,
        clientPhone: datos.celular,
        clientEmail: datos.correo,
        notes: datos.notas || undefined,
        firstVisit: datos.primera,
        curlType: linea?.pidePatron ? (datos.patron as "NO_SE" | "ONDULADO" | "RIZADO" | "CRESPO") : undefined,
        cupon: cuponOk ? cupon.texto : undefined,
      });
      if (r.ok) {
        setResultado(r);
        return;
      }
      if (r.campo === "cupon") {
        setCuponOk(null);
        setCuponError(r.error);
        return;
      }
      if (r.error.startsWith("Justo acaban de tomar")) {
        setHora(null);
        ir(4, "prev");
      }
      setError({ campo: r.campo, texto: r.error });
    });
  };

  const reiniciar = () => {
    setResultado(null);
    setLineaId(lineas.length === 1 ? lineas[0].id : null);
    setServiceId(null);
    setStaffId(null);
    setDia(null);
    setHora(null);
    setDatos({ nombre: "", celular: "", correo: "", patron: "NO_SE", notas: "", primera: false });
    setCupon({ abierto: false, texto: "" });
    setCuponOk(null);
    ir(lineas.length === 1 ? 2 : 1, "prev");
  };

  /* --- Rastro: lo elegido, tocable para volver a ese paso ------------------ */
  const rastro: { paso: number; contenido: React.ReactNode; label: string }[] = [];
  if (linea && paso > 1 && lineas.length > 1)
    rastro.push({ paso: 1, label: linea.name, contenido: <><Isotipo variante={linea.variante} /><span>{linea.name}</span></> });
  if (servicio && paso > 2) rastro.push({ paso: 2, label: servicio.name, contenido: <span>{servicio.name}</span> });
  if (staffId !== null && paso > 3)
    rastro.push({
      paso: 3,
      label: profesional?.name ?? "Cualquiera disponible",
      contenido: profesional ? (
        <>
          {profesional.imageUrl && <img src={profesional.imageUrl} alt="" />}
          <span>{profesional.name}</span>
        </>
      ) : (
        <span>Cualquiera disponible</span>
      ),
    });
  if (dia && hora && paso > 4)
    rastro.push({ paso: 4, label: "Día y hora", contenido: <span>{capital(etiquetaFecha(dia))} · {hora12(hora)}</span> });

  const errorDe = (campo: string) => (error?.campo === campo ? error.texto : null);

  return (
    <div className="rf">
      <div className="rf-wrap">
        <div className="rf-bar">
          {paso > 1 && !(paso === 2 && lineas.length === 1) && (
            <button type="button" className="rf-back" onClick={() => ir(paso - 1, "prev")}>
              Anterior
            </button>
          )}
          <span className="rf-count">
            Paso {paso} de {PASOS}
          </span>
        </div>
        <div className="rf-tide" aria-hidden="true">
          <i style={{ width: `calc(${(paso / PASOS) * 100}% + 40px)` }} />
        </div>
        {rastro.length > 0 && (
          <nav className="rf-trail" aria-label="Lo que elegiste">
            {rastro.map((r) => (
              <button key={r.paso} type="button" onClick={() => ir(r.paso, "prev")} aria-label={`Cambiar: ${r.label}`}>
                {r.contenido}
              </button>
            ))}
          </nav>
        )}

        <section key={paso} className={`rf-screen ${direccion === "prev" ? "rf-in-prev" : "rf-in-next"}`} aria-live="polite">
          {paso === 1 && (
            <>
              <h1 ref={titulo} tabIndex={-1}>¿Qué quieres agendar?</h1>
              <div className="rf-choices">
                {lineas.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="rf-choice rf-choice--line"
                    aria-pressed={lineaId === l.id}
                    onClick={() =>
                      elegir(() => {
                        if (lineaId !== l.id) {
                          setLineaId(l.id);
                          setServiceId(null);
                          setStaffId(null);
                          setDia(null);
                          setHora(null);
                        }
                      }, 2)
                    }
                  >
                    <Isotipo variante={l.variante} />
                    <span>
                      <b>{l.name}</b>
                      {l.description && <small>{l.description}</small>}
                    </span>
                    <i className="rf-go" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </>
          )}

          {paso === 2 && linea && (
            <>
              <h1 ref={titulo} tabIndex={-1}>Elige el servicio</h1>
              <div className="rf-choices">
                {linea.servicios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="rf-choice"
                    aria-pressed={serviceId === s.id}
                    onClick={() =>
                      elegir(() => {
                        if (serviceId !== s.id) {
                          setServiceId(s.id);
                          setCuponOk(null);
                          setCuponError(null);
                          setStaffId(null);
                          setDia(null);
                          setHora(null);
                        }
                      }, 3)
                    }
                  >
                    <span>
                      <b>{s.name}</b>
                      {s.tagline && <small>{s.tagline}</small>}
                      <span className="rf-meta">
                        {s.durationMin} min aprox.
                        {!s.hidePrice && s.price > 0 && (
                          <>
                            {" · "}
                            {s.promo ? (
                              <>
                                <s className="rf-old">{formatCOP(s.price)}</s> {formatCOP(s.promo.precioFinal)}{" "}
                                <span className="rf-promo">{s.promo.etiqueta}</span>
                              </>
                            ) : (
                              formatCOP(s.price)
                            )}
                          </>
                        )}
                      </span>
                    </span>
                    <i className="rf-go" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </>
          )}

          {paso === 3 && servicio && linea && (
            <>
              <h1 ref={titulo} tabIndex={-1}>¿Con quién quieres tu cita?</h1>
              {profesionales.length === 0 ? (
                <p className="rf-empty">Por ahora nadie del equipo tiene este servicio en su agenda. Escríbenos por WhatsApp y lo coordinamos.</p>
              ) : (
                <div className="rf-pros">
                  {profesionales.map((p) => {
                    const prox = proximos[p.id];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="rf-pro"
                        aria-pressed={staffId === p.id}
                        onClick={() =>
                          elegir(() => {
                            if (staffId !== p.id) {
                              setStaffId(p.id);
                              setHora(null);
                            }
                          }, 4)
                        }
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={`Foto de ${p.name}`} />
                        ) : (
                          <span className="rf-sinfoto" aria-hidden="true">{p.name.charAt(0)}</span>
                        )}
                        <span className="rf-cap">
                          <b>{p.name}</b>
                          <small>{p.specialty}</small>
                          {p.id in proximos && (
                            <span className="rf-meta">
                              {prox ? `Próximo cupo: ${partesDia(prox.fecha).corto} ${partesDia(prox.fecha).numero} · ${hora12(prox.hora)}` : "Sin cupos próximos"}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {profesionales.length > 1 && (
                    <button
                      type="button"
                      className="rf-pro rf-pro--any"
                      aria-pressed={staffId === CUALQUIERA}
                      onClick={() =>
                        elegir(() => {
                          if (staffId !== CUALQUIERA) {
                            setStaffId(CUALQUIERA);
                            setHora(null);
                          }
                        }, 4)
                      }
                    >
                      <Isotipo variante={linea.variante} />
                      <span>
                        <b>Cualquiera disponible</b>
                        <small>Ves todos los horarios del salón</small>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {paso === 4 && servicio && staffId !== null && (
            <>
              <h1 ref={titulo} tabIndex={-1}>Elige día y hora</h1>
              <p className="rf-lead">
                Horarios libres de {profesional ? profesional.name : "todo el equipo"} para{" "}
                {servicio.name.toLowerCase()}, unos {servicio.durationMin} minutos.
              </p>
              {error && !error.campo && <p className="rf-err">{error.texto}</p>}
              {dias === null ? (
                <p className="rf-loading">Buscando los días con cupo…</p>
              ) : Object.values(dias).every((n) => n === 0) ? (
                <p className="rf-empty">
                  No hay cupos en las próximas {maxConsulta} días. Prueba con otra profesional o escríbenos por WhatsApp.
                </p>
              ) : (
                <>
                  <div className="rf-days" role="group" aria-label="Días">
                    {Object.keys(dias)
                      .sort()
                      .map((f) => {
                        const n = dias[f];
                        const { corto, numero } = partesDia(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            className="rf-day"
                            aria-pressed={dia === f}
                            disabled={n === 0}
                            aria-label={`${capital(etiquetaFecha(f))}, ${n ? `${n} cupos` : "sin cupos"}`}
                            onClick={() => {
                              setDia(f);
                              setHora(null);
                            }}
                          >
                            <span>{corto}</span>
                            <b>{numero}</b>
                            <small>{n ? `${n} cupos` : "Sin cupos"}</small>
                          </button>
                        );
                      })}
                  </div>
                  {dia && (
                    <div className="rf-slots-box">
                      <h2 className="rf-when">{capital(etiquetaFecha(dia))}</h2>
                      {horas === null ? (
                        <p className="rf-loading">Cargando horarios…</p>
                      ) : horas.length === 0 ? (
                        <p className="rf-empty">Ese día ya no quedan horarios. Elige otro.</p>
                      ) : (
                        (
                          [
                            ["Mañana", horas.filter((h) => h < "12:00")],
                            ["Tarde", horas.filter((h) => h >= "12:00")],
                          ] as const
                        )
                          .filter(([, lista]) => lista.length > 0)
                          .map(([nombre, lista]) => (
                            <div key={nombre} className="rf-group">
                              <h3>{nombre}</h3>
                              <div className="rf-slots">
                                {lista.map((h) => (
                                  <button
                                    key={h}
                                    type="button"
                                    className="rf-slot"
                                    aria-pressed={hora === h}
                                    onClick={() => elegir(() => setHora(h), 5)}
                                  >
                                    {hora12(h)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {paso === 5 && servicio && dia && hora && (
            <>
              <h1 ref={titulo} tabIndex={-1}>Tus datos</h1>
              <div className="rf-recap">
                {profesional?.imageUrl ? <img src={profesional.imageUrl} alt="" /> : <Isotipo variante={linea?.variante ?? "salon"} />}
                <span>
                  <b>{servicio.name}</b>
                  <span>
                    {profesional ? `${profesional.name} · ` : ""}
                    {capital(etiquetaFecha(dia))} · {hora12(hora)}
                  </span>
                </span>
              </div>
              <form className="rf-form" onSubmit={reservar} noValidate>
                <div className="rf-field rf-full">
                  <label htmlFor="rf-nombre">Nombre y apellido</label>
                  <input
                    id="rf-nombre"
                    className="rf-input"
                    autoComplete="name"
                    value={datos.nombre}
                    aria-invalid={Boolean(errorDe("clientName"))}
                    onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  />
                  {errorDe("clientName") && <span className="rf-err">{errorDe("clientName")}</span>}
                </div>
                <div className="rf-field">
                  <label htmlFor="rf-celular">Celular</label>
                  <input
                    id="rf-celular"
                    className="rf-input"
                    type="tel"
                    autoComplete="tel"
                    value={datos.celular}
                    aria-invalid={Boolean(errorDe("clientPhone"))}
                    onChange={(e) => setDatos({ ...datos, celular: e.target.value })}
                  />
                  {errorDe("clientPhone") && <span className="rf-err">{errorDe("clientPhone")}</span>}
                </div>
                <div className="rf-field">
                  <label htmlFor="rf-correo">Correo electrónico</label>
                  <input
                    id="rf-correo"
                    className="rf-input"
                    type="email"
                    autoComplete="email"
                    value={datos.correo}
                    aria-invalid={Boolean(errorDe("clientEmail"))}
                    onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
                  />
                  {errorDe("clientEmail") && <span className="rf-err">{errorDe("clientEmail")}</span>}
                </div>
                {linea?.pidePatron && (
                  <div className="rf-field">
                    <label htmlFor="rf-patron">
                      Tu patrón de rizo <em>(opcional)</em>
                    </label>
                    <select
                      id="rf-patron"
                      className="rf-input"
                      value={datos.patron}
                      onChange={(e) => setDatos({ ...datos, patron: e.target.value })}
                    >
                      {PATRONES.map((p) => (
                        <option key={p.valor} value={p.valor}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={`rf-field ${linea?.pidePatron ? "" : "rf-full"}`}>
                  <label htmlFor="rf-notas">
                    ¿Algo que debamos saber? <em>(opcional)</em>
                  </label>
                  <textarea
                    id="rf-notas"
                    className="rf-input"
                    rows={2}
                    value={datos.notas}
                    onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
                  />
                </div>
                <label className="rf-check rf-full">
                  <input
                    type="checkbox"
                    checked={datos.primera}
                    onChange={(e) => setDatos({ ...datos, primera: e.target.checked })}
                  />
                  Es mi primera vez en Marea Rizada
                </label>
                {hayCupones && servicio && (
                  <div className="rf-cupon rf-full">
                    {cuponOk ? (
                      <p className="rf-cupon-ok">
                        Cupón <b>{cupon.texto.toUpperCase()}</b> aplicado ({cuponOk.etiqueta}): pagas{" "}
                        <b>{formatCOP(cuponOk.precioFinal)}</b> en lugar de {formatCOP(servicio.price)}.{" "}
                        <button
                          type="button"
                          className="rf-link"
                          onClick={() => {
                            setCuponOk(null);
                            setCupon({ abierto: true, texto: "" });
                          }}
                        >
                          Quitar
                        </button>
                      </p>
                    ) : !cupon.abierto ? (
                      <button type="button" className="rf-link" onClick={() => setCupon({ ...cupon, abierto: true })}>
                        ¿Tienes un cupón?
                      </button>
                    ) : (
                      <div className="rf-field">
                        <label htmlFor="rf-cupon">Cupón</label>
                        <div className="rf-cupon-fila">
                          <input
                            id="rf-cupon"
                            className="rf-input"
                            autoCapitalize="characters"
                            autoComplete="off"
                            value={cupon.texto}
                            aria-invalid={Boolean(cuponError)}
                            onChange={(e) => {
                              setCupon({ ...cupon, texto: e.target.value });
                              setCuponError(null);
                            }}
                          />
                          <button
                            type="button"
                            className="rf-btn rf-btn--outline"
                            disabled={revisando || !cupon.texto.trim()}
                            onClick={() =>
                              revisar(async () => {
                                const r = await revisarCupon(servicio.id, cupon.texto);
                                if (r.ok) setCuponOk(r);
                                else setCuponError(r.error);
                              })
                            }
                          >
                            {revisando ? "Revisando…" : "Aplicar"}
                          </button>
                        </div>
                        {cuponError && <span className="rf-err">{cuponError}</span>}
                      </div>
                    )}
                  </div>
                )}
                <div className="rf-note rf-full">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  <span>Te enviaremos la confirmación de tu cita a este correo, con la fecha, la hora y cómo llegar al salón.</span>
                </div>
                {error && !error.campo && <p className="rf-err rf-full">{error.texto}</p>}
                <div className="rf-full">
                  <button type="submit" className="rf-btn rf-btn--full" disabled={enviando}>
                    {enviando ? "Agendando…" : "Agendar cita"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {resultado && (
        <MareaFinal etiqueta="Tu cita quedó agendada">
          <div className="rf-card">
            <SelloMarea />
            <h2>Tu cita quedó agendada</h2>
            <p>
              La marea ya lleva tu confirmación a <span className="rf-to">{datos.correo.trim()}</span>
            </p>
            <p className="rf-code" aria-label={`Código de tu cita: ${resultado.codigo}`}>{resultado.codigo}</p>
            <dl>
              <div>
                <dt>Servicio</dt>
                <dd>{resultado.servicio}</dd>
              </div>
              {resultado.profesional && (
                <div>
                  <dt>Con</dt>
                  <dd>{resultado.profesional}</dd>
                </div>
              )}
              <div>
                <dt>Día</dt>
                <dd>{dia && capital(etiquetaFecha(dia))}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{hora && hora12(hora)}</dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>{resultado.direccion}</dd>
              </div>
              {resultado.precio && (
                <div>
                  <dt>Precio</dt>
                  <dd>
                    <s className="rf-old">{formatCOP(resultado.precio.lista)}</s> {formatCOP(resultado.precio.final)}
                  </dd>
                </div>
              )}
            </dl>
            {resultado.abono && (
              <div className="rf-abono">
                <OfertaAbono
                  codigo={resultado.codigo}
                  token={resultado.abono.token}
                  minimo={resultado.abono.minimo}
                  maximo={resultado.abono.maximo}
                />
              </div>
            )}
            <p className="rf-fine">
              Si no ves el correo en unos minutos, revisa la carpeta de spam. ¿Se te cruzó algo? Puedes{" "}
              <Link href={resultado.cambiar} className="underline underline-offset-2">
                cambiar tu cita tú misma
              </Link>
              .
            </p>
            <div className="rf-links">
              {resultado.whatsapp && (
                <a
                  className="rf-btn rf-btn--outline"
                  href={whatsappLink(resultado.whatsapp, `¡Hola Marea Rizada! Acabo de reservar con el código ${resultado.codigo}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              )}
              <button type="button" className="rf-btn rf-btn--light" onClick={reiniciar}>
                Agendar otra cita
              </button>
            </div>
          </div>
        </MareaFinal>
      )}
    </div>
  );
}
