"use client";

import { useActionState, useState } from "react";
import type { MediaSlot } from "@prisma/client";

import { SubmitButton } from "@/components/admin/form";
import { Badge } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/Uploader";
import { updateMediaSlot } from "./actions";
import type { ActionState } from "@/lib/actions";

export function MediaSlotForm({ slot }: { slot: MediaSlot }) {
  const action = updateMediaSlot.bind(null, slot.key);
  const [state, formAction] = useActionState(action, {} as ActionState);
  const [url, setUrl] = useState(slot.url ?? "");
  const [poster, setPoster] = useState(slot.posterUrl ?? "");

  const isVideo = slot.kind === "VIDEO" || slot.kind === "REEL";
  const icon = slot.kind === "IMAGE" ? "📷" : "🎥";

  return (
    <div className="border border-stone/70 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone/70 px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-ink">
            <span aria-hidden="true">{icon}</span>
            {slot.label}
          </p>
        </div>

        {url ? (
          <Badge tone="success">Cargado</Badge>
        ) : (
          <Badge tone="warning">Pendiente</Badge>
        )}
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_180px]">
        <form action={formAction}>
          {slot.recommendation && (
            <p className="mb-4 text-xs leading-relaxed font-normal text-muted">
              {slot.recommendation}
            </p>
          )}

          <Uploader carpeta="medios" onSubido={setUrl} compacto />
          <input type="hidden" name="url" value={url} />
          {url && (
            <p className="t-small mt-2 truncate">{url.split("/").pop()}</p>
          )}

          {isVideo && (
            <>
              <label className="mt-4 mb-1.5 block text-[10px] tracking-[0.12em] text-muted uppercase">
                Imagen de portada (opcional)
              </label>
              <div className="space-y-2">
                <Uploader carpeta="medios" onSubido={setPoster} compacto />
                <input type="hidden" name="posterUrl" value={poster} />
                {poster && (
                  <p className="t-small truncate">{poster.split("/").pop()}</p>
                )}
              </div>
            </>
          )}

          {state.error && (
            <p className="mt-3 text-xs text-red-600">{state.error}</p>
          )}
          {state.ok && state.message && (
            <p className="mt-3 text-xs text-emerald-600">{state.message}</p>
          )}

          <div className="mt-5 flex items-center gap-4">
            <SubmitButton className="px-6 py-2.5">Guardar</SubmitButton>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="text-[10px] tracking-[0.14em] text-muted uppercase transition-colors hover:text-red-600"
              >
                Vaciar campo
              </button>
            )}
          </div>
        </form>

        {/* Vista previa */}
        <div
          className="overflow-hidden border border-stone bg-sand/40"
          style={{ aspectRatio: slot.aspect || "16/9" }}
        >
          {url ? (
            isVideo ? (
              <video
                src={url}
                muted
                loop
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="media-hatch flex h-full w-full items-center justify-center text-center text-[10px] text-muted">
              {slot.aspect}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
