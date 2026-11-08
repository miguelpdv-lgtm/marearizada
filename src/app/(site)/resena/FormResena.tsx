"use client";

import { useState, useTransition, type FormEvent } from "react";

import { enviarResena } from "./actions";
import { SelloMarea } from "../reservar/MareaFinal";
import "../reservar/reserva.css";

const ETIQUETAS = ["", "No me gustó", "Regular", "Bien", "Muy bien", "Me encantó"];

export function FormResena({ codigo, token, nombre }: { codigo: string; token: string; nombre: string }) {
  const [datos, setDatos] = useState({ nombre, rating: 0, texto: "", autoriza: false });
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, enviar] = useTransition();

  const mandar = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    enviar(async () => {
      const r = await enviarResena({ codigo, token, ...datos });
      if (r.ok) setListo(true);
      else setError({ campo: r.campo, texto: r.error });
    });
  };

  if (listo) {
    return (
      <div className="rf-card rf-card--plana mx-auto text-center">
        <SelloMarea />
        <h2>¡Gracias por contarnos!</h2>
        <p>Tu reseña nos llegó. La revisamos y la publicamos pronto.</p>
      </div>
    );
  }

  const err = (campo: string) => (error?.campo === campo ? <span className="rf-err">{error.texto}</span> : null);

  return (
    <form className="rf-form" onSubmit={mandar} noValidate>
      <fieldset className="rf-field rf-full rf-estrellas">
        <legend>¿Cómo te fue?</legend>
        <div role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={datos.rating === n}
              aria-label={`${n} de 5: ${ETIQUETAS[n]}`}
              className={n <= datos.rating ? "on" : ""}
              onClick={() => {
                setDatos({ ...datos, rating: n });
                if (error?.campo === "rating") setError(null);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
              </svg>
            </button>
          ))}
          <span className="rf-estrellas-txt">{ETIQUETAS[datos.rating]}</span>
        </div>
        {err("rating")}
      </fieldset>
      <div className="rf-field rf-full">
        <label htmlFor="rs-texto">Tu experiencia</label>
        <textarea
          id="rs-texto"
          className="rf-input"
          rows={5}
          placeholder="Cómo llegaste, qué te hicimos y cómo va tu rizo."
          value={datos.texto}
          onChange={(e) => setDatos({ ...datos, texto: e.target.value })}
        />
        {err("texto")}
      </div>
      <div className="rf-field rf-full">
        <label htmlFor="rs-nombre">Cómo quieres que aparezca tu nombre</label>
        <input
          id="rs-nombre"
          className="rf-input"
          value={datos.nombre}
          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
        />
        {err("nombre")}
      </div>
      <label className="rf-check rf-full">
        <input
          type="checkbox"
          checked={datos.autoriza}
          onChange={(e) => {
            setDatos({ ...datos, autoriza: e.target.checked });
            if (error?.campo === "autoriza") setError(null);
          }}
        />
        Autorizo a Marea Rizada a publicar esta reseña con el nombre que escribí.
      </label>
      {err("autoriza")}
      {error && !error.campo && <p className="rf-err rf-full">{error.texto}</p>}
      <div className="rf-full">
        <button type="submit" className="rf-btn rf-btn--full" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar mi reseña"}
        </button>
      </div>
    </form>
  );
}
