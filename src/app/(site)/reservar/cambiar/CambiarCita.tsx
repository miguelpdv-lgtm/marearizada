"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { etiquetaFecha, hora12 } from "../fechas";
import { buscarMiCita, cambiarMiCita, diasParaCambiar, horasParaCambiar } from "./actions";
import "../reserva.css";

const entrada = "rf-input w-full";
const DIAS_VISIBLES = 21;
const CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const AVISO_ULTIMA =
  "Última cita del día: tenemos un máximo de 15 minutos de espera. Si llegas más tarde, la reagendamos.";

/** Código + celular → la cita. */
export function BuscarCita({ codigoInicial }: { codigoInicial: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [celular, setCelular] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await buscarMiCita(codigo, celular);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          router.push(r.url);
        });
      }}
      className="space-y-5 border-2 border-stone bg-paper p-6"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink">Código de la cita</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="MR-7K3P"
          autoCapitalize="characters"
          autoComplete="off"
          className={`${entrada} font-mono tracking-[0.08em]`}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink">Celular con el que reservaste</span>
        <input
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          placeholder="300 000 0000"
          inputMode="tel"
          autoComplete="tel"
          className={entrada}
        />
      </label>
      {error && <p className="text-sm text-terra">{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? "Buscando…" : "Buscar mi cita"}
      </button>
    </form>
  );
}

/** Elegir el día y la hora nuevos y confirmar. */
export function CambiarCita({
  codigo,
  token,
  hoy,
  maxDias,
  ultimaCita,
}: {
  codigo: string;
  token: string;
  hoy: string;
  maxDias: number;
  ultimaCita: Record<number, string>;
}) {
  const [cupos, setCupos] = useState<Record<string, number> | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horas, setHoras] = useState<string[] | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ fecha: string; hora: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let vivo = true;
    diasParaCambiar(codigo, token, hoy, Math.min(DIAS_VISIBLES, maxDias)).then((r) => {
      if (!vivo) return;
      setCupos(r);
      setFecha((f) => f ?? Object.keys(r).sort().find((d) => r[d] > 0) ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [codigo, token, hoy, maxDias]);

  useEffect(() => {
    if (!fecha) return;
    let vivo = true;
    setHoras(null);
    setHora(null);
    horasParaCambiar(codigo, token, fecha).then((r) => vivo && setHoras(r));
    return () => {
      vivo = false;
    };
  }, [codigo, token, fecha]);

  const ultima = fecha ? (ultimaCita[new Date(`${fecha}T12:00:00Z`).getUTCDay()] ?? null) : null;

  if (listo) {
    return (
      <div className="rf mt-8"><div className="rf-card rf-card--plana mx-auto text-center">
        <h2>¡Listo! Tu cita cambió</h2>
        <p>
          Ahora es el <strong>{etiquetaFecha(listo.fecha)}</strong> a las <strong>{hora12(listo.hora)}</strong>.
        </p>
        <p className="rf-fine">Te enviamos la confirmación por correo. Tu código sigue siendo {codigo}.</p>
      </div></div>
    );
  }

  const confirmar = () => {
    if (!fecha || !hora) return;
    setError(null);
    startTransition(async () => {
      const r = await cambiarMiCita(codigo, token, fecha, hora);
      if (!r.ok) {
        setError(r.error);
        // La hora pudo haberse ocupado: se refrescan las libres.
        setHoras(await horasParaCambiar(codigo, token, fecha));
        setHora(null);
        return;
      }
      setListo({ fecha, hora });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const grupos = horas
    ? ([
        ["Mañana", horas.filter((h) => h < "12:00")],
        ["Tarde", horas.filter((h) => h >= "12:00")],
      ] as const)
    : [];

  return (
    <div className="rf mt-10">
      <div className="rf-wrap" style={{ paddingTop: 0 }}>
        <h2 className="rf-when">Elige el nuevo día y hora</h2>
        {cupos === null ? (
          <p className="rf-loading">Buscando los días con cupo…</p>
        ) : Object.values(cupos).every((n) => n === 0) ? (
          <p className="rf-empty">No hay cupos en los próximos días. Escríbenos por WhatsApp y lo movemos.</p>
        ) : (
          <div className="rf-days" role="group" aria-label="Días">
            {Object.keys(cupos)
              .sort()
              .map((f) => {
                const n = cupos[f];
                return (
                  <button
                    key={f}
                    type="button"
                    className="rf-day"
                    aria-pressed={fecha === f}
                    disabled={n === 0}
                    onClick={() => setFecha(f)}
                  >
                    <span>{CORTOS[new Date(`${f}T12:00:00Z`).getUTCDay()]}</span>
                    <b>{Number(f.slice(-2))}</b>
                    <small>{n ? `${n} cupos` : "Sin cupos"}</small>
                  </button>
                );
              })}
          </div>
        )}

        {fecha && (
          <div className="rf-slots-box">
            <h3 className="rf-when">{capital(etiquetaFecha(fecha))}</h3>
            {horas === null ? (
              <p className="rf-loading">Cargando horarios…</p>
            ) : horas.length === 0 ? (
              <p className="rf-empty">No quedan horas ese día. Prueba con otra fecha.</p>
            ) : (
              grupos
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
                          onClick={() => setHora(h)}
                        >
                          {hora12(h)}
                          {h === ultima && <span aria-hidden> *</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            )}
            {ultima && horas?.includes(ultima) && <p className="rf-fine">* {AVISO_ULTIMA}</p>}
          </div>
        )}

        {fecha && hora && (
          <div className="rf-recap" style={{ marginTop: 24 }}>
            <span>
              <b>Tu cita pasa al {etiquetaFecha(fecha)}</b>
              <span>a las {hora12(hora)}</span>
            </span>
          </div>
        )}
        {error && <p className="rf-err">{error}</p>}
        {fecha && hora && (
          <button type="button" onClick={confirmar} disabled={pending} className="rf-btn rf-btn--full" style={{ marginTop: 16 }}>
            {pending ? "Cambiando…" : "Confirmar el cambio"}
          </button>
        )}
      </div>
    </div>
  );
}
