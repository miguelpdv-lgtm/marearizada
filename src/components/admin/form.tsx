"use client";

import Link from "next/link";
import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/actions";
import { Toast } from "@/components/admin/Toast";
import { Uploader } from "@/components/admin/Uploader";

/* --- Campos ----------------------------------------------------------------- */

const inputBase =
  "admin-control px-4 py-3 text-sm placeholder:text-clay disabled:bg-smoke disabled:text-muted";

export function Field({
  label,
  name,
  hint,
  errors,
  required,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  errors?: Record<string, string[]>;
  required?: boolean;
  children: React.ReactNode;
}) {
  const fieldErrors = errors?.[name];

  return (
    <div>
      <label
        htmlFor={name}
        className="admin-kicker mb-2 block text-[10px] tracking-[0.12em]"
      >
        {label}
        {required && <span className="ml-1 text-terra">*</span>}
      </label>

      {children}

      {hint && !fieldErrors && (
        <p className="mt-1.5 text-xs font-normal text-muted">{hint}</p>
      )}

      {fieldErrors?.map((e) => (
        <p key={e} className="mt-1.5 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

export function Input({
  name,
  type = "text",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return <input id={name} name={name} type={type} className={inputBase} {...rest} />;
}

export function Textarea({
  name,
  rows = 4,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  return (
    <textarea
      id={name}
      name={name}
      rows={rows}
      className={`${inputBase} resize-y leading-relaxed`}
      {...rest}
    />
  );
}

export function Select({
  name,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }) {
  return (
    <select id={name} name={name} className={inputBase} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-stone bg-paper px-4 py-3.5 transition-colors ${
        disabled ? "opacity-60" : "cursor-pointer hover:border-terra"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-terra"
      />
      <span>
        <span className="block text-sm font-normal text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * Grupo de checkboxes para una relación muchos-a-muchos (p. ej. qué
 * servicios hace un profesional): todas las opciones marcadas por
 * defecto, con un botón para marcar/desmarcar todas de una vez y las
 * opciones agrupadas por categoría para que no sea una lista plana larga.
 * Todas las casillas comparten `name`, así que el servidor las lee con
 * `formData.getAll(name)`.
 */
export function CheckboxGroup({
  name,
  groups,
  defaultValues = [],
  emptyHint,
}: {
  name: string;
  groups: { label: string; options: { value: string; label: string }[] }[];
  defaultValues?: string[];
  emptyHint?: string;
}) {
  const todasLasOpciones = groups.flatMap((g) => g.options);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(defaultValues));

  if (todasLasOpciones.length === 0) {
    return emptyHint ? <p className="t-small text-muted">{emptyHint}</p> : null;
  }

  const todosMarcados = marcados.size === todasLasOpciones.length;

  const alternarTodos = () => {
    setMarcados(todosMarcados ? new Set() : new Set(todasLasOpciones.map((o) => o.value)));
  };

  const alternarUno = (value: string) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {marcados.size} de {todasLasOpciones.length} marcados
        </p>
        <button
          type="button"
          onClick={alternarTodos}
          className="text-xs font-semibold text-terra underline underline-offset-2 hover:text-terra-deep"
        >
          {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-2 text-[11px] tracking-[0.12em] text-muted uppercase">
              {g.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone bg-paper px-3.5 py-2.5 transition-colors hover:border-terra"
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={o.value}
                    checked={marcados.has(o.value)}
                    onChange={() => alternarUno(o.value)}
                    className="h-4 w-4 shrink-0 accent-terra"
                  />
                  <span className="text-sm text-ink">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Campo de imagen: sube el archivo directo a Supabase Storage — sin URL
 * externa, para que todo el material real quede alojado en tu propio
 * Storage y bajo tu control. Con vista previa en vivo.
 */
export function ImageField({
  name,
  label,
  defaultValue,
  hint,
  errors,
  aspect = "4/3",
  carpeta = "medios",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  errors?: Record<string, string[]>;
  aspect?: string;
  /** Subcarpeta del bucket donde se guarda el archivo. */
  carpeta?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field label={label} name={name} hint={hint} errors={errors}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-3">
          <Uploader carpeta={carpeta} onSubido={setValue} />
          <input type="hidden" name={name} value={value} />

          {value && (
            <div className="flex items-center justify-between gap-3">
              <p className="t-small min-w-0 truncate">{value.split("/").pop()}</p>
              <button
                type="button"
                onClick={() => setValue("")}
                className="shrink-0 text-xs text-muted underline transition-colors hover:text-red-600"
              >
                Quitar
              </button>
            </div>
          )}
        </div>

        <div
          className="w-full shrink-0 overflow-hidden border border-stone bg-sand/40 sm:w-40"
          style={{ aspectRatio: aspect }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="media-hatch flex h-full w-full items-center justify-center text-xs text-muted">
              Vista previa
            </span>
          )}
        </div>
      </div>
    </Field>
  );
}

/**
 * Varias fotos, en orden: se suben de a una, se reordenan con las flechas y
 * se quitan de la lista. Quitar no borra el archivo del almacenamiento —
 * solo deja de mostrarse—, así ninguna foto se pierde por un clic de más.
 */
export function GalleryField({
  name,
  label,
  defaultValue,
  hint,
  carpeta = "medios",
}: {
  name: string;
  label: string;
  defaultValue?: string[] | null;
  hint?: string;
  carpeta?: string;
}) {
  const [fotos, setFotos] = useState<string[]>(defaultValue ?? []);

  const mover = (i: number, delta: number) =>
    setFotos((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  return (
    <Field label={label} name={name} hint={hint}>
      <input type="hidden" name={name} value={JSON.stringify(fotos)} />
      {fotos.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {fotos.map((url, i) => (
            <li key={url} className="space-y-1.5">
              <div className="aspect-square overflow-hidden border border-stone bg-sand/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    aria-label="Mover antes"
                    className="px-1 text-ink disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === fotos.length - 1}
                    aria-label="Mover después"
                    className="px-1 text-ink disabled:opacity-30"
                  >
                    →
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setFotos((prev) => prev.filter((_, k) => k !== i))}
                  className="text-muted underline hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Uploader
        carpeta={carpeta}
        onSubido={(url) => setFotos((prev) => (prev.includes(url) ? prev : [...prev, url]))}
      />
    </Field>
  );
}

/* --- Formulario ------------------------------------------------------------- */

export function SubmitButton({
  children = "Guardar",
  className = "",
  pending: pendingProp,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Para formularios que envían a mano (sin `action` nativo), donde
   * `useFormStatus` no se entera del envío. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-primary disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (!state.error && !state.message) return null;

  const danger = Boolean(state.error);

  return (
    <div
      role="status"
      className={`mb-6 border px-5 py-4 text-sm font-normal ${
        danger
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {state.error ?? state.message}
    </div>
  );
}

/**
 * Formulario del panel: conecta una server action con el estado de errores
 * y expone `fieldErrors` a los campos hijos mediante render prop.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Guardar cambios",
  cancelHref,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (errors: Record<string, string[]>) => React.ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  extra?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const formId = useId();
  const alertRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<string | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  // Si el guardado falla, llevar la vista al mensaje de error: el aviso
  // está arriba del formulario y en uno largo quedaba fuera de pantalla.
  // Si sale bien, avisarlo con un pop-up que se ve desde cualquier parte.
  useEffect(() => {
    if (state.error) alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (state.ok) setToast(state.message ?? "Guardado exitosamente.");
  }, [state]);

  return (
    <div className="max-w-6xl">
      {toast && <Toast message={toast} onClose={cerrarToast} />}
      <form
        id={formId}
        // Envío a mano en vez de `action={formAction}`: con `action`, React
        // resetea el formulario después de cada envío — si el servidor
        // devolvía un error, se borraba todo lo escrito (menos la imagen,
        // que vive en estado de React) y había que empezar de cero.
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <div ref={alertRef}>
          {/* El éxito va en el pop-up; acá solo los errores. */}
          <FormAlert state={state.error ? state : {}} />
        </div>

        <div className="space-y-6">{children(state.fieldErrors ?? {})}</div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-6">
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>

          {cancelHref && (
            <Link
              href={cancelHref}
              className="px-5 py-3 text-sm text-muted transition-colors hover:text-ink"
            >
              Cancelar
            </Link>
          )}
        </div>
      </form>

      {/* Fuera del <form>: `extra` siempre trae su propio <form> (botón
       * eliminar) — anidar un <form> dentro de otro es HTML inválido y
       * causaba un error de hidratación. */}
      {extra && <div className="mt-3 flex">{extra}</div>}
    </div>
  );
}

/** Botón de borrado con confirmación, para usar dentro de un <form>. */
export function DeleteButton({
  label = "Eliminar",
  confirmMessage = "¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.",
}: {
  label?: string;
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="text-[10px] tracking-[0.18em] text-red-600 uppercase transition-colors hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "Eliminando…" : label}
    </button>
  );
}
