"use client";

import { useEffect, useState, useTransition } from "react";

import { formatCOP } from "@/lib/format";
import { iniciarPago, simularPago } from "./actions";
import { etiquetaFecha, hora12 } from "./fechas";
import type { InfoPago, ResumenCita } from "./resumen";

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function restante(venceEn: string) {
  return Math.max(0, Math.floor((new Date(venceEn).getTime() - Date.now()) / 1000));
}

/**
 * El paso del pago. El cupo ya está apartado; la cita se confirma cuando la
 * pasarela aprueba el abono (o el total, si la clienta prefiere). Con la
 * pasarela en modo de prueba, en lugar de cobrar se simula el resultado.
 */
export function PagoAbono({
  codigo,
  token,
  resumen,
  pago,
  titulo,
  onConfirmada,
  onVolver,
}: {
  codigo: string;
  token: string;
  resumen: ResumenCita;
  pago: InfoPago;
  titulo?: React.Ref<HTMLHeadingElement>;
  onConfirmada: (r: ResumenCita) => void;
  /** Volver a cambiar algo (suelta el cupo) o a elegir otra hora. */
  onVolver: () => void;
}) {
  const [modo, setModo] = useState<"ABONO" | "TOTAL">("ABONO");
  const [segundos, setSegundos] = useState(() => restante(pago.venceEn));
  const [prueba, setPrueba] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vencida, setVencida] = useState(false);
  const [ocupado, ejecutar] = useTransition();

  useEffect(() => {
    const t = window.setInterval(() => setSegundos(restante(pago.venceEn)), 1000);
    return () => window.clearInterval(t);
  }, [pago.venceEn]);
  useEffect(() => {
    if (segundos === 0) setVencida(true);
  }, [segundos]);

  const soloTotal = pago.abono >= pago.total;
  const monto = modo === "TOTAL" || soloTotal ? pago.total : pago.abono;

  const pagar = () =>
    ejecutar(async () => {
      setAviso(null);
      const r = await iniciarPago(codigo, token, soloTotal ? "TOTAL" : modo);
      if (!r.ok) {
        if (r.vencida) setVencida(true);
        setAviso(r.error);
        return;
      }
      if (r.inicio.tipo === "redirect") window.location.assign(r.inicio.url);
      else setPrueba(r.inicio.referencia);
    });

  const simular = (aprobado: boolean) =>
    ejecutar(async () => {
      if (!prueba) return;
      const r = await simularPago(codigo, token, prueba, aprobado);
      setPrueba(null);
      if (!r.ok) return setAviso(r.error);
      if (r.resumen.estado === "CONFIRMADA") onConfirmada(r.resumen);
      else if (r.resumen.estado === "CANCELADA" || r.vencida) {
        setAviso(
          r.resumen.pagado > 0
            ? "El pago llegó cuando el cupo ya se había liberado. El salón te contactará para reagendar o devolverte el abono."
            : null,
        );
        setVencida(true);
      } else setAviso("El pago fue rechazado. Puedes intentarlo otra vez con otro medio.");
    });

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  if (vencida) {
    return (
      <>
        <h1 ref={titulo} tabIndex={-1}>Se acabó el tiempo para pagar</h1>
        {aviso && <p className="rf-err" style={{ marginTop: 12 }}>{aviso}</p>}
        <p className="rf-lead" style={{ marginTop: 12 }}>
          El cupo de las {hora12(resumen.hora)} se liberó para otras personas. Puedes elegir otra hora y volver a
          intentarlo.
        </p>
        <button type="button" className="rf-btn" style={{ marginTop: 24 }} onClick={onVolver}>
          Elegir otra hora
        </button>
      </>
    );
  }

  return (
    <>
      <h1 ref={titulo} tabIndex={-1}>Paga el abono para confirmar</h1>
      <p className="rf-lead" style={{ marginTop: 10 }}>
        Tu cupo está apartado. La cita queda confirmada cuando se apruebe el pago; lo que pagues se descuenta del
        valor del servicio.
      </p>

      <div className="rf-recap" style={{ marginTop: 20 }}>
        <span>
          <b>{resumen.servicio}</b>
          <span>
            {resumen.profesional ? `${resumen.profesional} · ` : ""}
            {capital(etiquetaFecha(resumen.fecha))} · {hora12(resumen.hora)}
          </span>
        </span>
      </div>

      <p className={`rf-timer${segundos < 180 ? " rf-timer--poco" : ""}`} role="timer" aria-live="off">
        Te guardamos este cupo por <b>{mm}:{ss}</b>
      </p>

      {soloTotal ? (
        <div className="rf-montos">
          <div className="rf-monto" aria-pressed="true">
            <b>{formatCOP(pago.total)}</b>
            <span>Valor del servicio{resumen.promocion ? ` con ${resumen.promocion}` : ""}</span>
          </div>
        </div>
      ) : (
        <div className="rf-montos" role="radiogroup" aria-label="Cuánto quieres pagar ahora">
          <button
            type="button"
            role="radio"
            aria-checked={modo === "ABONO"}
            className="rf-monto"
            onClick={() => setModo("ABONO")}
          >
            <b>{formatCOP(pago.abono)}</b>
            <span>Abono. El resto, {formatCOP(pago.total - pago.abono)}, en el salón</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={modo === "TOTAL"}
            className="rf-monto"
            onClick={() => setModo("TOTAL")}
          >
            <b>{formatCOP(pago.total)}</b>
            <span>Pago completo{resumen.promocion ? ` con ${resumen.promocion}` : ""}. No pagas nada en el salón</span>
          </button>
        </div>
      )}

      {aviso && <p className="rf-err" style={{ marginTop: 14 }}>{aviso}</p>}

      {prueba ? (
        <div className="rf-prueba">
          <p>
            <b>Modo de prueba.</b> La pasarela de pagos todavía no está conectada: elige qué respondería el banco.
            No se cobra nada.
          </p>
          <div className="rf-links">
            <button type="button" className="rf-btn" disabled={ocupado} onClick={() => simular(true)}>
              Pago aprobado
            </button>
            <button type="button" className="rf-btn rf-btn--outline" disabled={ocupado} onClick={() => simular(false)}>
              Pago rechazado
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="rf-btn rf-btn--full"
          style={{ marginTop: 20 }}
          disabled={ocupado || !pago.pasarela}
          onClick={pagar}
        >
          {ocupado ? "Preparando el pago…" : `Pagar ${formatCOP(monto)}`}
        </button>
      )}
      <p className="rf-fine" style={{ marginTop: 14 }}>
        Pagas con tarjeta, PSE o Nequi en la pasarela segura. Para cancelar después, escríbenos.{" "}
        <button type="button" className="rf-link" onClick={onVolver}>
          Cambiar algo de la reserva
        </button>
      </p>
    </>
  );
}
