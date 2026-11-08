"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BloqueHoras, Calendario, entrada } from "../ReservaFlow";
import { etiquetaFecha, hora12 } from "../fechas";
import { buscarMiCita, cambiarMiCita, diasParaCambiar, horasParaCambiar } from "./actions";

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
      className="tarjeta space-y-5 border-2 border-stone bg-paper p-6"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink">Código de la cita</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="AMI-7K3P"
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
  const [mesInicio, setMesInicio] = useState(hoy);
  const [cupos, setCupos] = useState<Record<string, number>>({});
  const [fecha, setFecha] = useState<string | null>(null);
  const [horas, setHoras] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [hora, setHora] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ fecha: string; hora: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let vivo = true;
    diasParaCambiar(codigo, token, mesInicio, 42).then((r) => vivo && setCupos(r));
    return () => {
      vivo = false;
    };
  }, [codigo, token, mesInicio]);

  useEffect(() => {
    if (!fecha) return;
    let vivo = true;
    setCargando(true);
    setHora(null);
    horasParaCambiar(codigo, token, fecha)
      .then((r) => vivo && setHoras(r))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [codigo, token, fecha]);

  const ultima = fecha ? (ultimaCita[new Date(`${fecha}T12:00:00Z`).getUTCDay()] ?? null) : null;

  if (listo) {
    return (
      <div className="mx-auto mt-8 max-w-md border-2 border-emerald-600/40 bg-paper p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg text-paper">
          ✓
        </span>
        <p className="t-card mt-4 text-ink">¡Listo! Tu cita cambió</p>
        <p className="mt-2 text-ink">
          Ahora es el <strong>{etiquetaFecha(listo.fecha)}</strong> a las{" "}
          <strong>{hora12(listo.hora)}</strong>.
        </p>
        <p className="t-small mt-3">Te enviamos la confirmación por correo. Tu código sigue siendo {codigo}.</p>
      </div>
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

  return (
    <div className="mt-10">
      <p className="t-eyebrow mb-6 text-center text-terra-deep">Elige el nuevo día y hora</p>
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
        <div>
          <p className="t-eyebrow mb-4 text-terra-deep">
            {fecha ? etiquetaFecha(fecha) : "Elige un día primero"}
          </p>
          {!fecha && <p className="t-small">Los días con punto tienen cupo disponible.</p>}
          {fecha && cargando && <p className="t-small">Buscando horas libres…</p>}
          {fecha && !cargando && horas.length === 0 && (
            <p className="tarjeta border-2 border-stone bg-cream p-5 text-sm text-ink">
              No quedan horas ese día. Prueba con otra fecha.
            </p>
          )}
          {fecha && !cargando && horas.length > 0 && (
            <>
              <BloqueHoras
                titulo="Mañana"
                horas={horas.filter((h) => Number(h.slice(0, 2)) < 12)}
                elegida={hora}
                onElegir={setHora}
                ultima={ultima}
              />
              <BloqueHoras
                titulo="Tarde"
                horas={horas.filter((h) => Number(h.slice(0, 2)) >= 12)}
                elegida={hora}
                onElegir={setHora}
                ultima={ultima}
              />
            </>
          )}

          {fecha && hora && (
            <div className="mt-8 border-t-2 border-stone pt-6">
              <p className="text-sm text-ink">
                Tu cita pasa al <strong>{etiquetaFecha(fecha)}</strong> a las{" "}
                <strong>{hora12(hora)}</strong>.
              </p>
              {error && <p className="mt-3 text-sm text-terra">{error}</p>}
              <button
                type="button"
                onClick={confirmar}
                disabled={pending}
                className="btn btn-primary mt-4 disabled:opacity-60"
              >
                {pending ? "Cambiando…" : "Confirmar el cambio"}
              </button>
            </div>
          )}
          {error && !hora && <p className="mt-4 text-sm text-terra">{error}</p>}
        </div>
      </div>
    </div>
  );
}
