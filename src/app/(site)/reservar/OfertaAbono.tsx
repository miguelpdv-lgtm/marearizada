"use client";

import { useState, useTransition } from "react";
import Script from "next/script";

import { formatCOP } from "@/lib/format";
import { iniciarAbono } from "./actions";

const SCRIPT_BOLD = "https://checkout.bold.co/library/boldPaymentButton.js";

/**
 * Abono opcional al terminar de reservar. La cita ya quedó guardada: esto es
 * solo una invitación a asegurarla, nunca un requisito. La clienta elige cuánto
 * abonar, desde el mínimo de Bold hasta el valor del servicio (dejar la cita
 * paga). El pago lo aloja Bold (mismo checkout de la tienda) y el servidor
 * valida el monto antes de firmarlo.
 */
export function OfertaAbono({
  codigo,
  token,
  minimo,
  maximo,
}: {
  codigo: string;
  token: string;
  /** Lo menos que cobra Bold. */
  minimo: number;
  /** El valor del servicio: lo más que se puede abonar. */
  maximo: number;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparando, iniciar] = useTransition();

  const monto = Number(texto.replace(/\D/g, "")) || 0;
  const valido = monto >= minimo && monto <= maximo;
  const esTotal = monto === maximo;

  const pagar = () => {
    setError(null);
    if (!valido) {
      setError(
        monto > maximo
          ? `Tu cita cuesta ${formatCOP(maximo)}; no puedes abonar más que eso.`
          : `El abono mínimo es ${formatCOP(minimo)}.`,
      );
      return;
    }
    iniciar(async () => {
      const r = await iniciarAbono(codigo, token, monto);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (!window.BoldCheckout) {
        setError("El pago todavía se está cargando. Dale un segundo y vuelve a intentarlo.");
        return;
      }
      new window.BoldCheckout(r.checkout).open();
    });
  };

  return (
    <div className="tarjeta mx-auto mt-6 max-w-md bg-ink p-6 text-left text-paper">
      <Script src={SCRIPT_BOLD} strategy="afterInteractive" />
      <p className="t-eyebrow text-gold-500">Opcional</p>
      <p className="mt-2 font-display text-xl leading-snug">¿Quieres abonar a tu cita?</p>
      <p className="mt-2 text-sm text-paper/75">
        Abona el valor que quieras o deja tu cita paga. Lo que abones se descuenta el día de la
        cita; si prefieres, pagas todo en el salón.
      </p>

      <label className="mt-5 block text-sm font-semibold" htmlFor="monto-abono">
        ¿Cuánto quieres abonar?
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-paper px-4 text-ink">
          <span aria-hidden="true">$</span>
          <input
            id="monto-abono"
            inputMode="numeric"
            autoComplete="off"
            placeholder={maximo.toLocaleString("es-CO")}
            value={monto ? monto.toLocaleString("es-CO") : ""}
            onChange={(e) => {
              setError(null);
              setTexto(e.target.value);
            }}
            className="w-full min-w-0 bg-transparent py-3 pl-1 text-base outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setTexto(String(maximo));
          }}
          className="btn-link text-gold-300"
        >
          Pagar el total ({formatCOP(maximo)})
        </button>
      </div>

      <button
        type="button"
        onClick={pagar}
        disabled={preparando || monto === 0}
        className="btn btn-gold mt-5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {preparando
          ? "Preparando el pago…"
          : monto === 0
            ? "Abonar"
            : esTotal
              ? `Pagar ${formatCOP(monto)}`
              : `Abonar ${formatCOP(monto)}`}
      </button>
      {error && <p className="mt-3 text-sm text-gold-300">{error}</p>}
    </div>
  );
}
