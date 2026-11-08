"use client";

import { useState } from "react";

import { telLink, whatsappLink } from "@/lib/format";

/**
 * Los datos de contacto de la clienta, arriba en la ficha de la cita, con un
 * botón para copiar cada uno (para pegarlo en WhatsApp, en el datáfono o
 * donde haga falta) y accesos directos para escribirle o llamarla.
 */
export function DatosCliente({
  nombre,
  telefono,
  correo,
  primeraVez,
  tipoRizo,
  nota,
}: {
  nombre: string;
  telefono: string;
  correo: string | null;
  primeraVez: boolean;
  tipoRizo: string | null;
  nota: string | null;
}) {
  const wa = whatsappLink(telefono, `¡Hola ${nombre.split(" ")[0]}! Te escribimos de Amicrespa.`);

  return (
    <section className="border border-stone bg-white px-4 py-3">
      <p className="mb-2 text-[11px] tracking-[0.12em] text-muted uppercase">Datos de la clienta</p>
      <dl className="space-y-2 text-sm">
        <Dato etiqueta="Nombre" valor={nombre} />
        <Dato etiqueta="Celular" valor={telefono}>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="text-terra underline underline-offset-2">
                WhatsApp
              </a>
            )}
            <a href={`tel:${telLink(telefono)}`} className="text-terra underline underline-offset-2">
              Llamar
            </a>
          </div>
        </Dato>
        {correo ? (
          <Dato etiqueta="Correo" valor={correo}>
            <a href={`mailto:${correo}`} className="mt-1 inline-block text-xs text-terra underline underline-offset-2">
              Escribir correo
            </a>
          </Dato>
        ) : (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Correo</dt>
            <dd className="text-muted">Sin correo</dd>
          </div>
        )}
        {(primeraVez || tipoRizo) && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Sobre ella</dt>
            <dd className="text-right text-ink">
              {[primeraVez ? "Primera vez" : null, tipoRizo ? `Rizo ${tipoRizo.toLowerCase()}` : null]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
        )}
        {nota && (
          <div>
            <dt className="text-muted">Nota de la clienta</dt>
            <dd className="mt-0.5 text-ink">{nota}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  children,
}: {
  etiqueta: string;
  valor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 pt-0.5 text-muted">{etiqueta}</dt>
      <dd className="min-w-0 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="min-w-0 break-all text-ink select-all">{valor}</span>
          <BotonCopiar texto={valor} etiqueta={etiqueta} />
        </div>
        {children}
      </dd>
    </div>
  );
}

function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Navegadores sin permiso al portapapeles: se copia a la antigua.
      const campo = document.createElement("textarea");
      campo.value = texto;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ${etiqueta.toLowerCase()}`}
      className={`shrink-0 rounded border px-2 py-0.5 text-[11px] transition-colors ${
        copiado ? "border-ink bg-ink text-gold-500" : "border-stone text-ink hover:border-terra"
      }`}
    >
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
