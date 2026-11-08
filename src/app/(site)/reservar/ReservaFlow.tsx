"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";

import { CurlMark } from "@/components/brand/Logo";
import { IlustracionRizo, IlustracionServicio } from "@/components/brand/IlustracionServicio";
import { CurlyHairOn } from "@/components/brand/CurlyHairOn";
import { ManchasSeccion } from "@/components/brand/Manchas";
import { formatCOP, formatDuration, whatsappLink } from "@/lib/format";
import {
  crearReserva,
  obtenerDiasConCupo,
  obtenerHoras,
  type ResultadoReserva,
} from "./actions";
import { OfertaAbono } from "./OfertaAbono";
import { etiquetaFecha } from "./fechas";

/* --- Tipos ----------------------------------------------------------------- */

type Sede = {
  id: string;
  city: string;
  name: string;
  address: string;
  imageUrl: string | null;
  hours: string | null;
  whatsapp: string | null;
  cerrados: number[];
  /** Hora de la última cita de cada día de la semana (0 = domingo). */
  ultimaCita: Record<number, string>;
  /** Si la sede está cerrada temporalmente, el aviso que se muestra. */
  cierre: string | null;
};

type Servicio = {
  id: string;
  branchId: string | null;
  categoryId: string | null;
  name: string;
  tagline: string | null;
  description: string;
  price: number;
  /** Precio que no se muestra en la web (se cotiza en la valoración). */
  hidePrice?: boolean;
  durationMin: number;
  imageUrl: string | null;
  featured: boolean;
};

type Categoria = { id: string; name: string; description: string | null };

const PASOS = ["Sede", "Servicio", "Día y hora", "Tus datos"] as const;

const RIZOS_OPCIONES = [
  { valor: "ONDULADO", label: "Ondulado", pista: "Ondas suaves" },
  { valor: "RIZADO", label: "Rizado", pista: "Rizos en espiral" },
  { valor: "CRESPO", label: "Crespo", pista: "Rizo cerrado y denso" },
  { valor: "NO_SE", label: "No sé", pista: "Lo vemos juntas" },
] as const;

const DIAS_CORTOS = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function sumarDias(fecha: string, n: number) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}


/* --- Componente ------------------------------------------------------------ */

export function ReservaFlow({
  sedes,
  servicios,
  categorias,
  hoy,
  maxDias,
  sedeInicial,
  servicioInicial,
}: {
  sedes: Sede[];
  servicios: Servicio[];
  categorias: Categoria[];
  hoy: string;
  maxDias: number;
  /** Preselección al llegar desde una tarjeta de servicio. */
  sedeInicial?: string;
  servicioInicial?: string;
}) {
  // Si llega con servicio elegido, se salta directo al calendario.
  const abiertas = sedes.filter((s) => !s.cierre);
  const preseleccion = servicios.find(
    (s) => s.id === servicioInicial && (!s.branchId || abiertas.some((a) => a.id === s.branchId)),
  );
  const sedePre =
    preseleccion?.branchId ??
    (abiertas.some((s) => s.id === sedeInicial) ? sedeInicial : undefined);

  const [paso, setPaso] = useState(preseleccion ? 2 : sedePre ? 1 : 0);
  const [sedeId, setSedeId] = useState<string | null>(sedePre ?? null);
  const [servicioId, setServicioId] = useState<string | null>(
    preseleccion?.id ?? null,
  );
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);

  const [cupos, setCupos] = useState<Record<string, number>>({});
  const [horas, setHoras] = useState<string[]>([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [primeraVez, setPrimeraVez] = useState(false);
  const [tipoRizo, setTipoRizo] = useState<string | null>(null);
  const [notas, setNotas] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoReserva | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  const sede = sedes.find((s) => s.id === sedeId) ?? null;
  // La última cita del día tiene un máximo de 15 minutos de espera: se avisa
  // solo cuando la clienta elige justo esa hora.
  const ultimaDelDia =
    sede && fecha ? sede.ultimaCita[new Date(`${fecha}T12:00:00Z`).getUTCDay()] ?? null : null;
  const esUltima = Boolean(hora && ultimaDelDia && hora === ultimaDelDia);
  const servicio = servicios.find((s) => s.id === servicioId) ?? null;

  const serviciosDeSede = useMemo(
    () => servicios.filter((s) => !s.branchId || s.branchId === sedeId),
    [servicios, sedeId],
  );

  const categoriasConServicios = useMemo(
    () => categorias.filter((c) => serviciosDeSede.some((s) => s.categoryId === c.id)),
    [categorias, serviciosDeSede],
  );

  const serviciosVisibles = useMemo(
    () =>
      categoriaId
        ? serviciosDeSede.filter((s) => s.categoryId === categoriaId)
        : serviciosDeSede,
    [serviciosDeSede, categoriaId],
  );

  // Días con cupo del mes visible
  const [mesInicio, setMesInicio] = useState(hoy);

  useEffect(() => {
    if (!sedeId || !servicioId) return;
    let vivo = true;
    obtenerDiasConCupo(sedeId, servicioId, mesInicio, 42).then((r) => {
      if (vivo) setCupos(r);
    });
    return () => {
      vivo = false;
    };
  }, [sedeId, servicioId, mesInicio]);

  // Horas del día elegido
  useEffect(() => {
    if (!sedeId || !servicioId || !fecha) return;
    let vivo = true;
    setCargandoHoras(true);
    setHora(null);
    obtenerHoras(sedeId, servicioId, fecha)
      .then((r) => vivo && setHoras(r))
      .finally(() => vivo && setCargandoHoras(false));
    return () => {
      vivo = false;
    };
  }, [sedeId, servicioId, fecha]);

  // Al elegir un día, el bloque de horas queda a la vista sin que haya
  // que bajar a buscarlo — sobre todo en móvil, donde calendario y
  // horas van apilados.
  const horasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fecha) horasRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fecha]);

  // Cada paso arranca arriba, viendo su propio título — si no, tras
  // avanzar automáticamente (por ejemplo al elegir la hora) la pantalla
  // se queda donde estaba el botón de la hora, muy abajo.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso]);

  // Elegir la hora ya completa el paso: avanza sola en vez de esperar
  // un "Continuar" de más.
  const elegirHora = (h: string) => {
    setHora(h);
    setTimeout(() => setPaso(3), 300);
  };

  const puedeAvanzar =
    (paso === 0 && sedeId) ||
    (paso === 1 && servicioId) ||
    (paso === 2 && fecha && hora) ||
    paso === 3;

  const confirmar = () => {
    setError(null);
    iniciarEnvio(async () => {
      const r = await crearReserva({
        branchId: sedeId!,
        serviceId: servicioId!,
        fecha: fecha!,
        hora: hora!,
        clientName: nombre,
        clientPhone: celular,
        clientEmail: correo,
        notes: notas,
        firstVisit: primeraVez,
        curlType: (tipoRizo as "ONDULADO" | "RIZADO" | "CRESPO" | "NO_SE") ?? undefined,
      });
      if (r.ok) setResultado(r);
      else setError(r.error);
    });
  };

  /* --- Confirmación ------------------------------------------------------- */

  // La pantalla de "tu cita quedó lista" reemplaza todo el flujo — sin
  // esto, el scroll se queda donde estaba el formulario, muy abajo.
  useEffect(() => {
    if (resultado?.ok) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resultado]);

  // Al confirmar, antes del resumen, el cartel "CURLY HAIR #ON".
  const [celebrando, setCelebrando] = useState(false);
  useEffect(() => {
    if (resultado?.ok) setCelebrando(true);
  }, [resultado?.ok]);
  const finCelebracion = useCallback(() => setCelebrando(false), []);

  if (resultado?.ok) {
    const wa = whatsappLink(
      resultado.whatsapp,
      `¡Hola Amicrespa! Acabo de reservar con el código ${resultado.codigo}.`,
    );
    return (
      <section className="con-manchas seccion bg-gold-500">
        {celebrando && <CurlyHairOn onFin={finCelebracion} />}
        <ManchasSeccion sobre="amarillo" variante={0} semilla={26} />
        <div className="shell text-center">
          <CurlMark className="mx-auto h-14 w-auto text-ink" />
          <p className="t-eyebrow mt-8 text-terra-deep">Tu cita quedó lista</p>
          <h1 className="t-editorial mt-4 text-balance text-ink">
            Nos vemos pronto, {nombre.split(" ")[0]}
          </h1>

          <div className="tarjeta mx-auto mt-10 max-w-md bg-paper p-8 text-left">
            <p className="t-eyebrow text-clay">Tu código</p>
            <p className="t-pop mt-1 text-4xl text-terra">{resultado.codigo}</p>

            <dl className="mt-7 space-y-3 border-t border-stone pt-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Servicio</dt>
                <dd className="text-right text-ink">{resultado.servicio}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Cuándo</dt>
                <dd className="text-right text-ink">
                  {etiquetaFecha(fecha!)} · {hora}
                </dd>
              </div>
              {esUltima && (
                <div className="text-xs text-terra-deep">
                  Es la última cita del día: tenemos un máximo de 15 minutos de espera.
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Dónde</dt>
                <dd className="text-right text-ink">
                  {resultado.sede}
                  <span className="block text-xs text-muted">{resultado.direccion}</span>
                </dd>
              </div>
            </dl>
          </div>

          {resultado.abono && (
            <OfertaAbono
              codigo={resultado.codigo}
              token={resultado.abono.token}
              minimo={resultado.abono.minimo}
              maximo={resultado.abono.maximo}
            />
          )}

          <p className="t-small mx-auto mt-6 max-w-sm text-ink">
            Te enviamos la confirmación a tu correo. Si necesitas mover la cita, puedes{" "}
            <Link href={resultado.cambiar} className="underline underline-offset-2 hover:text-terra">
              cambiarla tú misma
            </Link>{" "}
            con tu código.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Escribirnos por WhatsApp
              </a>
            )}
            <Link href="/" className="btn btn-outline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* --- Flujo -------------------------------------------------------------- */

  return (
    <section className="bg-canvas">
      {/* Cabecera con progreso: amarilla, sigue a la barra de navegación
          como una sola pieza, igual que el hero de la portada. */}
      <div className="con-manchas bg-gold-500">
        <ManchasSeccion sobre="amarillo" variante={2} semilla={27} />
        <div className="shell py-10 md:py-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="t-eyebrow text-terra-deep">Reserva tu cita</p>
            <Link href="/reservar/cambiar" className="text-sm text-ink underline underline-offset-4 hover:text-terra-deep">
              ¿Ya tienes cita? Cámbiala aquí
            </Link>
          </div>
          <h1 className="t-editorial mt-3 text-ink">
            {paso === 0 && "¿En cuál de nuestras casas te esperamos?"}
            {paso === 1 && "¿Qué necesita tu cabello hoy?"}
            {paso === 2 && "Elige el día y la hora"}
            {paso === 3 && "Cuéntanos de ti"}
          </h1>

          {/* Progreso: cuatro tramos a tope, como bloques */}
          <ol className="mt-8 grid max-w-3xl grid-cols-4 gap-1.5">
            {PASOS.map((p, i) => (
              <li key={p} aria-current={i === paso ? "step" : undefined}>
                <span
                  className={`block h-1.5 transition-colors duration-500 ${
                    i < paso ? "bg-terra" : i === paso ? "bg-ink" : "bg-ink/15"
                  }`}
                />
                <span
                  className={`t-eyebrow mt-2.5 block text-[10px] sm:text-xs ${
                    i === paso ? "text-ink" : "text-ink/75"
                  }`}
                >
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {p}
                  {i < paso && <span className="sr-only"> (listo)</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="con-manchas">
      <ManchasSeccion sobre="claro" variante={1} semilla={31} />
      <div className="shell grid grid-cols-1 gap-8 py-10 md:py-14 lg:grid-cols-12 lg:gap-12">
        <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:col-span-8 lg:row-start-1">
          {/* PASO 1 · Sede */}
          {paso === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {sedes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!!s.cierre}
                  onClick={() => {
                    setSedeId(s.id);
                    setServicioId(null);
                    setCategoriaId(null);
                    setPaso(1);
                  }}
                  className={`tarjeta zoom-parent group border-2 bg-paper text-left transition-all duration-300 ${
                    s.cierre ? "cursor-not-allowed" : "hover:-translate-y-1"
                  } ${sedeId === s.id ? "border-terra" : "border-transparent"}`}
                >
                  <div className="relative aspect-[4/3] bg-cream">
                    {s.imageUrl ? (
                      <Image
                        src={s.imageUrl}
                        alt={s.city}
                        fill
                        sizes="(max-width: 640px) 92vw, 40vw"
                        className="zoom-img object-cover"
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 flex items-center justify-center ${
                          sedes.indexOf(s) % 2 === 0 ? "bg-terra-pale" : "bg-sky"
                        }`}
                      >
                        <span className="t-poster text-[clamp(2rem,5vw,3.25rem)] text-ink">{s.city}</span>
                      </div>
                    )}
                    <span className="t-eyebrow absolute top-4 left-4 bg-gold-500 px-3.5 py-1.5 text-ink">
                      {s.city}
                    </span>
                    {s.cierre && (
                      <span className="absolute inset-0 flex items-end bg-ink/60 p-4">
                        <span className="t-eyebrow bg-paper px-3.5 py-1.5 text-terra-deep">
                          Cerrada temporalmente
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="t-card text-ink">{s.name}</p>
                    <p className="t-small mt-1.5">{s.address}</p>
                    {s.cierre ? (
                      <p className="mt-3 text-sm font-semibold text-terra-deep">{s.cierre}</p>
                    ) : s.hours && (
                      <p className="t-small mt-3 whitespace-pre-line text-clay">
                        {s.hours}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PASO 2 · Servicio */}
          {paso === 1 && (
            <div>
              <div className="no-scrollbar -mx-5 mb-7 flex gap-2 overflow-x-auto overscroll-x-contain px-5 md:mx-0 md:flex-wrap md:px-0">
                <Chip activo={!categoriaId} onClick={() => setCategoriaId(null)}>
                  Todos
                </Chip>
                {categoriasConServicios.map((c) => (
                  <Chip
                    key={c.id}
                    activo={categoriaId === c.id}
                    onClick={() => setCategoriaId(c.id)}
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {serviciosVisibles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServicioId(s.id);
                      setFecha(null);
                      setHora(null);
                      setPaso(2);
                    }}
                    className={`tarjeta flex gap-4 border-2 bg-paper p-4 text-left transition-all duration-300 ${
                      servicioId === s.id
                        ? "border-ink bg-cream"
                        : "border-transparent hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-cream">
                      {s.imageUrl ? (
                        <Image
                          src={s.imageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <IlustracionServicio
                          nombre={s.name}
                          categoria={categorias.find((c) => c.id === s.categoryId)?.name}
                          className="absolute inset-0"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="t-card text-ink">{s.name}</p>
                      {s.tagline && <p className="t-small mt-0.5">{s.tagline}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {s.hidePrice ? (
                          <span className="text-sm text-ink">Precio en valoración</span>
                        ) : s.price === 0 ? (
                          <span className="bg-gold-500 px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                            Gratis
                          </span>
                        ) : (
                          <span className="text-sm text-ink">
                            {formatCOP(s.price)}
                          </span>
                        )}
                        <span className="t-small text-clay">
                          {formatDuration(s.durationMin)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 3 · Día y hora */}
          {paso === 2 && (
            <div className="grid gap-8 md:grid-cols-2">
              <Calendario
                hoy={hoy}
                maxDias={maxDias}
                mesInicio={mesInicio}
                setMesInicio={setMesInicio}
                cupos={cupos}
                fecha={fecha}
                onElegir={setFecha}
              />

              <div ref={horasRef} className="scroll-mt-28">
                <p className="t-eyebrow mb-4 text-terra-deep">
                  {fecha ? etiquetaFecha(fecha) : "Elige un día primero"}
                </p>

                {!fecha && (
                  <p className="t-small">
                    Los días con punto tienen cupo disponible.
                  </p>
                )}

                {fecha && cargandoHoras && (
                  <p className="t-small">Buscando horas libres…</p>
                )}

                {fecha && !cargandoHoras && horas.length === 0 && (
                  <div className="tarjeta border-2 border-stone bg-cream p-5">
                    <p className="text-sm text-ink">
                      No quedan horas ese día para este servicio.
                    </p>
                    <p className="t-small mt-1">Prueba con otra fecha.</p>
                  </div>
                )}

                {fecha && !cargandoHoras && horas.length > 0 && (
                  <>
                    <BloqueHoras
                      titulo="Mañana"
                      horas={horas.filter((h) => Number(h.slice(0, 2)) < 12)}
                      elegida={hora}
                      onElegir={elegirHora}
                      ultima={ultimaDelDia}
                    />
                    <BloqueHoras
                      titulo="Tarde"
                      horas={horas.filter((h) => Number(h.slice(0, 2)) >= 12)}
                      elegida={hora}
                      onElegir={elegirHora}
                      ultima={ultimaDelDia}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* PASO 4 · Datos */}
          {paso === 3 && (
            <div className="space-y-8">
              {esUltima && <AvisoUltima />}
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo label="¿Cómo te llamas?" requerido>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className={entrada}
                    autoComplete="name"
                  />
                </Campo>
                <Campo label="Celular (WhatsApp)" requerido>
                  <input
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="300 000 0000"
                    inputMode="tel"
                    className={entrada}
                    autoComplete="tel"
                  />
                </Campo>
              </div>

              <Campo label="Correo" requerido ayuda="Ahí te llega la confirmación de la cita.">
                <input
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  type="email"
                  className={entrada}
                  autoComplete="email"
                />
              </Campo>

              <div>
                <p className="t-eyebrow mb-1 text-terra-deep">¿Cómo es tu rizo?</p>
                <p className="t-small mb-4">
                  Nos ayuda a prepararnos. Si no sabes, no importa.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {RIZOS_OPCIONES.map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() =>
                        setTipoRizo(tipoRizo === o.valor ? null : o.valor)
                      }
                      className={`tarjeta zoom-parent group border-2 bg-paper text-left transition-all duration-300 ${
                        tipoRizo === o.valor
                          ? "-translate-y-1 border-ink"
                          : "border-transparent hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="relative aspect-square">
                        <IlustracionRizo tipo={o.valor} className="absolute inset-0" />
                        {tipoRizo === o.valor && (
                          <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-2xl text-gold-500">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-ink">{o.label}</p>
                        <p className="t-small">{o.pista}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="tarjeta flex cursor-pointer items-start gap-3 border-2 border-stone bg-paper p-4">
                <input
                  type="checkbox"
                  checked={primeraVez}
                  onChange={(e) => setPrimeraVez(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-terra"
                />
                <span>
                  <span className="block text-sm text-ink">
                    Es mi primera vez en Amicrespa
                  </span>
                  <span className="t-small">
                    Nos tomamos un rato más contigo al inicio de la cita.
                  </span>
                </span>
              </label>

              <Campo label="¿Algo que debamos saber?" ayuda="Opcional.">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Alergias, tratamientos recientes, lo que quieras contarnos…"
                  className={`${entrada} resize-y`}
                />
              </Campo>

              {error && (
                <p className="border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          )}

        </div>

        {/* Resumen: en móvil va antes del botón de confirmar (2º),
            para que se lea "esto es lo que vas a confirmar" antes del
            botón, no después. */}
        <aside className="order-2 min-w-0 lg:order-none lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:row-span-2">
          <div className="tarjeta bg-ink p-6 text-paper md:p-7 lg:sticky lg:top-28">
            <p className="t-eyebrow text-gold-500">Tu cita</p>

            <dl className="mt-6 space-y-4 text-sm">
              <Resumen etiqueta="Sede" valor={sede ? `${sede.city} · ${sede.address}` : null} />
              <Resumen etiqueta="Servicio" valor={servicio?.name ?? null} />
              <Resumen
                etiqueta="Duración"
                valor={servicio ? formatDuration(servicio.durationMin) : null}
              />
              <Resumen
                etiqueta="Cuándo"
                valor={fecha ? `${etiquetaFecha(fecha)}${hora ? ` · ${hora}` : ""}` : null}
              />
            </dl>
            {esUltima && (
              <p className="mt-4 text-xs text-gold-300">
                Última cita del día: máximo 15 minutos de espera.
              </p>
            )}

            {servicio && (
              <div className="mt-6 flex items-baseline justify-between border-t border-paper/20 pt-5">
                <span className="t-eyebrow text-gold-500">Total</span>
                <span className="display text-2xl text-paper">
                  {servicio.hidePrice
                    ? "En valoración"
                    : servicio.price === 0
                      ? "Gratis"
                      : formatCOP(servicio.price)}
                </span>
              </div>
            )}

            <p className="mt-5 text-sm leading-relaxed text-paper/80">
              Abono opcional. Confirmamos por correo.
            </p>
          </div>
        </aside>

        {/* Navegación: fija abajo en móvil para que el CTA nunca se
            pierda al bajar por una lista larga (servicios, calendario).
            3º en móvil — después del resumen, nunca antes. */}
        <div className="order-3 sticky bottom-0 z-10 -mx-5 flex items-center justify-between gap-4 border-t border-stone bg-canvas px-5 py-5 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.15)] md:static md:mx-0 md:bg-transparent md:px-0 md:pt-6 md:shadow-none lg:order-none lg:col-start-1 lg:col-span-8 lg:row-start-2">
          <button
            type="button"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className="btn-link disabled:pointer-events-none disabled:opacity-30"
          >
            ← Atrás
          </button>

          {paso < 3 ? (
            <button
              type="button"
              onClick={() => setPaso((p) => p + 1)}
              disabled={!puedeAvanzar}
              className="btn btn-primary disabled:pointer-events-none disabled:opacity-35"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="btn btn-primary disabled:opacity-60"
            >
              {enviando ? "Reservando…" : "Confirmar mi cita"}
            </button>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}

/* --- Piezas ---------------------------------------------------------------- */

export const entrada =
  "w-full rounded border-2 border-stone bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-clay transition-colors focus:border-terra focus:outline-none";

function Campo({
  label,
  ayuda,
  requerido,
  children,
}: {
  label: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="t-eyebrow mb-2 block text-terra-deep">
        {label}
        {requerido && <span className="ml-1 text-terra">*</span>}
      </label>
      {children}
      {ayuda && <p className="t-small mt-1.5">{ayuda}</p>}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`t-eyebrow shrink-0 rounded-full border-2 px-4 py-2 transition-colors ${
        activo
          ? "border-ink bg-ink text-gold-500"
          : "border-stone text-ink hover:border-terra"
      }`}
    >
      {children}
    </button>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="t-eyebrow text-gold-500">{etiqueta}</dt>
      <dd className={`mt-1 ${valor ? "text-paper" : "text-paper/60"}`}>
        {valor ?? "Por elegir"}
      </dd>
    </div>
  );
}

export function BloqueHoras({
  titulo,
  horas,
  elegida,
  onElegir,
  ultima,
}: {
  titulo: string;
  horas: string[];
  elegida: string | null;
  onElegir: (h: string) => void;
  /** Hora de la última cita del día, que lleva su aviso. */
  ultima?: string | null;
}) {
  if (horas.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="t-small mb-2 text-clay">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {horas.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onElegir(h)}
            className={`rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
              elegida === h
                ? "border-ink bg-ink text-gold-500"
                : "border-stone text-ink hover:border-terra"
            }`}
          >
            {h}
            {h === ultima && <span aria-hidden> *</span>}
          </button>
        ))}
      </div>
      {ultima && horas.includes(ultima) && (
        <p className="t-small mt-2 text-clay">* {AVISO_ULTIMA}</p>
      )}
    </div>
  );
}

const AVISO_ULTIMA =
  "Última cita del día: tenemos un máximo de 15 minutos de espera. Si llegas más tarde, la reagendamos.";

function AvisoUltima() {
  return (
    <p className="mt-4 border border-gold-500 bg-gold-100 px-4 py-3 text-left text-sm text-ink">
      {AVISO_ULTIMA}
    </p>
  );
}

export function Calendario({
  hoy,
  maxDias,
  mesInicio,
  setMesInicio,
  cupos,
  fecha,
  onElegir,
}: {
  hoy: string;
  maxDias: number;
  mesInicio: string;
  setMesInicio: (f: string) => void;
  cupos: Record<string, number>;
  fecha: string | null;
  onElegir: (f: string) => void;
}) {
  const [a, m] = mesInicio.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1));
  const diasDelMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const desplazamiento = primero.getUTCDay();
  const ultimo = sumarDias(hoy, maxDias);

  const celdas: (string | null)[] = [
    ...Array(desplazamiento).fill(null),
    ...Array.from({ length: diasDelMes }, (_, i) =>
      `${a}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];

  const mover = (delta: number) => {
    const nuevo = new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 10);
    setMesInicio(nuevo < hoy ? hoy : nuevo);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => mover(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-stone text-ink transition-colors hover:border-terra hover:bg-cream"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <p className="t-card text-ink">
          {MESES[m - 1]} {a}
        </p>
        <button
          type="button"
          onClick={() => mover(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-stone text-ink transition-colors hover:border-terra hover:bg-cream"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS_CORTOS.map((d, i) => (
          <span key={i} className="t-small py-1 text-clay">
            {d}
          </span>
        ))}

        {celdas.map((f, i) => {
          if (!f) return <span key={`v${i}`} />;
          const cupo = cupos[f] ?? 0;
          const fuera = f < hoy || f > ultimo;
          const libre = cupo > 0 && !fuera;
          const activo = fecha === f;

          return (
            <button
              key={f}
              type="button"
              disabled={!libre}
              onClick={() => onElegir(f)}
              className={`relative aspect-square rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                activo
                  ? "border-ink bg-ink text-gold-500"
                  : libre
                    ? "border-stone text-ink hover:-translate-y-0.5 hover:border-terra"
                    : "cursor-not-allowed border-transparent text-clay/50"
              }`}
            >
              {Number(f.slice(-2))}
              {libre && !activo && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-terra" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
