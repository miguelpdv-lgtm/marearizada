"use client";

import Link from "next/link";

import { formatCOP, whatsappLink } from "@/lib/format";
import { etiquetaFecha, hora12 } from "./fechas";
import { MareaFinal, SelloMarea } from "./MareaFinal";
import type { ResumenCita } from "./resumen";

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** El cierre: la marea, la botella y la tarjeta con la cita confirmada. */
export function TarjetaConfirmada({ resumen, onOtra }: { resumen: ResumenCita; onOtra?: () => void }) {
  const saldo = Math.max(0, resumen.precioFinal - resumen.pagado);
  return (
    <MareaFinal etiqueta="Tu cita quedó confirmada">
      <div className="rf-card">
        <SelloMarea />
        <h2>Tu cita quedó confirmada</h2>
        {resumen.correo && (
          <p>
            La marea ya lleva tu confirmación a <span className="rf-to">{resumen.correo}</span>
          </p>
        )}
        <p className="rf-code" aria-label={`Código de tu cita: ${resumen.codigo}`}>
          {resumen.codigo}
        </p>
        <dl>
          <div>
            <dt>Servicio</dt>
            <dd>{resumen.servicio}</dd>
          </div>
          {resumen.profesional && (
            <div>
              <dt>Con</dt>
              <dd>{resumen.profesional}</dd>
            </div>
          )}
          <div>
            <dt>Día</dt>
            <dd>{capital(etiquetaFecha(resumen.fecha))}</dd>
          </div>
          <div>
            <dt>Hora</dt>
            <dd>{hora12(resumen.hora)}</dd>
          </div>
          <div>
            <dt>Lugar</dt>
            <dd>{resumen.direccion}</dd>
          </div>
          {resumen.pagado > 0 && (
            <div>
              <dt>Pagaste</dt>
              <dd>{formatCOP(resumen.pagado)}</dd>
            </div>
          )}
          {resumen.pagado > 0 && (
            <div>
              <dt>En el salón</dt>
              <dd>{saldo > 0 ? formatCOP(saldo) : "Nada más"}</dd>
            </div>
          )}
        </dl>
        <p className="rf-fine">
          Si no ves el correo en unos minutos, revisa la carpeta de spam. ¿Se te cruzó algo? Puedes{" "}
          <Link href={resumen.cambiar} className="underline underline-offset-2">
            cambiar tu cita tú misma
          </Link>
          ; para cancelar, escríbenos.
        </p>
        <div className="rf-links">
          {resumen.whatsapp && (
            <a
              className="rf-btn rf-btn--outline"
              href={whatsappLink(resumen.whatsapp, `¡Hola Marea Rizada! Acabo de reservar con el código ${resumen.codigo}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribir por WhatsApp
            </a>
          )}
          {onOtra ? (
            <button type="button" className="rf-btn rf-btn--light" onClick={onOtra}>
              Agendar otra cita
            </button>
          ) : (
            <a className="rf-btn rf-btn--light" href="/reservar">
              Agendar otra cita
            </a>
          )}
        </div>
      </div>
    </MareaFinal>
  );
}
