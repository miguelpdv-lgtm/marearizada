"use client";

import { useState } from "react";

import { PagoAbono } from "../../PagoAbono";
import { TarjetaConfirmada } from "../../TarjetaConfirmada";
import type { InfoPago, ResumenCita } from "../../resumen";
import "../../reserva.css";

export function PagoRetorno({
  codigo,
  token,
  resumen,
  pago,
  vencida,
  rechazado,
}: {
  codigo: string;
  token: string;
  resumen: ResumenCita;
  pago: InfoPago | null;
  vencida: boolean;
  rechazado: boolean;
}) {
  const [confirmada, setConfirmada] = useState<ResumenCita | null>(
    resumen.estado === "CONFIRMADA" || resumen.estado === "PENDIENTE" ? resumen : null,
  );

  if (confirmada) return <TarjetaConfirmada resumen={confirmada} />;

  return (
    <section className="rf">
      <div className="rf-wrap rf-screen">
        {pago && !vencida ? (
          <>
            {rechazado && (
              <p className="rf-err" style={{ marginBottom: 16 }}>
                El último intento de pago fue rechazado. Puedes intentarlo otra vez.
              </p>
            )}
            <PagoAbono
              codigo={codigo}
              token={token}
              resumen={resumen}
              pago={pago}
              onConfirmada={setConfirmada}
              onVolver={() => window.location.assign("/reservar")}
            />
          </>
        ) : (
          <>
            <h1>{vencida ? "Se acabó el tiempo para pagar" : "Esta reserva ya no está activa"}</h1>
            <p className="rf-lead" style={{ marginTop: 12 }}>
              {vencida
                ? "El cupo se liberó porque el pago no se completó a tiempo. Si alcanzaste a pagar, escríbenos y lo resolvemos."
                : "Si crees que es un error, escríbenos con tu código de reserva."}
            </p>
            <a className="rf-btn" style={{ marginTop: 24 }} href="/reservar">
              Reservar de nuevo
            </a>
          </>
        )}
      </div>
    </section>
  );
}
