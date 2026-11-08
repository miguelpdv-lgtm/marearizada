"use client";

import { useEffect } from "react";

/**
 * La última red: se dispara cuando el error ocurre en el layout raíz, antes de
 * que exista el `<body>` del sitio. Por eso este archivo, y solo este, tiene
 * que traer sus propios `<html>` y `<body>` — no hay layout debajo que los
 * ponga.
 *
 * Estilos en línea a propósito: si lo que falló fue el layout raíz, tampoco se
 * puede contar con que la hoja de estilos haya cargado.
 */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] error en el layout raíz:", error);
  }, [error]);

  return (
    <html lang="es-CO">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf9f5",
          color: "#5b001d",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "#b1300b",
              fontWeight: 600,
            }}
          >
            Marea Rizada
          </p>
          <h1
            style={{
              margin: "12px 0 0",
              fontSize: "26px",
              lineHeight: 1.25,
              color: "#5b001d",
            }}
          >
            El sitio no está disponible
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: "15px", color: "#7f384f" }}>
            Estamos teniendo un problema técnico. Vuelve a intentarlo en un
            momento.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "26px",
              padding: "12px 26px",
              borderRadius: "999px",
              border: "none",
              background: "#5b001d",
              color: "#faf9f5",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>

          {error.digest && (
            <p
              style={{
                margin: "24px 0 0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                color: "#8b4b5e",
              }}
            >
              Referencia: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
