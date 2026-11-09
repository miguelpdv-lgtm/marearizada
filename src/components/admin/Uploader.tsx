"use client";

import { useCallback, useRef, useState } from "react";

import { pedirPermisoDeSubida } from "@/app/admin/(panel)/medios/upload-actions";

/**
 * Subidor de archivos a Supabase Storage.
 *
 * El archivo va del navegador directo a Supabase: el servidor solo firma el
 * permiso. Por eso no hay límite de 4.5 MB y los videos suben sin problema.
 */

const ACEPTA =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime";

const MAXIMO = 50 * 1024 * 1024;

function subirConProgreso(
  signedUrl: string,
  archivo: File,
  onProgreso: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("content-type", archivo.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Supabase respondió ${xhr.status}. ${xhr.responseText.slice(0, 160)}`));

    xhr.onerror = () => reject(new Error("Se cortó la conexión durante la subida."));
    xhr.onabort = () => reject(new Error("Subida cancelada."));

    xhr.send(archivo);
  });
}

export function Uploader({
  carpeta,
  onSubido,
  compacto = false,
}: {
  /** Subcarpeta dentro del bucket: servicios, productos, equipo… */
  carpeta: string;
  /** Recibe la URL pública ya lista para guardar. */
  onSubido: (url: string) => void;
  compacto?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"listo" | "subiendo">("listo");
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);

  const manejar = useCallback(
    async (archivo: File | undefined) => {
      if (!archivo) return;

      setError(null);

      if (archivo.size > MAXIMO) {
        setError(
          `Pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 50 MB.`,
        );
        return;
      }

      setEstado("subiendo");
      setProgreso(0);

      try {
        const permiso = await pedirPermisoDeSubida(
          carpeta,
          archivo.name,
          archivo.type,
          archivo.size,
        );

        if (!permiso.ok) {
          setError(permiso.error);
          return;
        }

        await subirConProgreso(permiso.signedUrl, archivo, setProgreso);
        onSubido(permiso.urlPublica);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setEstado("listo");
        setProgreso(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [carpeta, onSubido],
  );

  const subiendo = estado === "subiendo";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!subiendo) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          if (!subiendo) void manejar(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !subiendo && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Subir archivo"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !subiendo) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center border border-dashed text-center transition-colors ${
          compacto ? "px-4 py-4" : "px-5 py-7"
        } ${
          encima
            ? "border-terra bg-gold-50"
            : subiendo
              ? "cursor-wait border-stone bg-smoke"
              : "border-stone bg-white hover:border-marea hover:bg-gold-50"
        }`}
      >
        {subiendo ? (
          <>
            <p className="text-sm text-ink">Subiendo… {progreso}%</p>
            <div className="mt-2.5 h-1 w-full max-w-xs overflow-hidden bg-stone">
              <div
                className="h-full bg-terra transition-all duration-200"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink">
              Arrastra un archivo o <span className="underline">búscalo</span>
            </p>
            {!compacto && (
              <p className="t-small mt-1">
                JPG, PNG, WEBP, SVG, MP4 o MOV · hasta 50 MB
              </p>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA}
        className="hidden"
        onChange={(e) => void manejar(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
