"use client";

import { useState } from "react";
import type {
  Branch,
  BusinessHour,
  Service,
  ServiceCategory,
  StaffSchedule,
  TeamMember,
} from "@prisma/client";

import {
  AdminForm,
  CheckboxGroup,
  Field,
  ImageField,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type ServicioConCategoria = Service & { category: ServiceCategory | null };

export function TeamForm({
  action,
  member,
  branches,
  services,
  schedule = [],
  assignedServiceIds = [],
  businessHours,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  member?: TeamMember;
  branches: Branch[];
  /** Todos los servicios activos (de todas las sedes); se filtran por la sede elegida. */
  services: ServicioConCategoria[];
  /** Horario ya guardado de este profesional (vacío si es nuevo). */
  schedule?: StaffSchedule[];
  assignedServiceIds?: string[];
  /** Horario de todas las sedes, para sugerir un punto de partida sensato. */
  businessHours: BusinessHour[];
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  const [branchId, setBranchId] = useState(member?.branchId ?? (branches.length === 1 ? branches[0].id : ""));

  const serviciosDeLaSede = branchId
    ? services.filter((s) => !s.branchId || s.branchId === branchId)
    : [];

  const grupos = Object.values(
    serviciosDeLaSede.reduce<Record<string, { label: string; options: { value: string; label: string }[] }>>(
      (acc, s) => {
        const clave = s.category?.name ?? "Sin categoría";
        (acc[clave] ??= { label: clave, options: [] }).options.push({
          value: s.id,
          label: s.name,
        });
        return acc;
      },
      {},
    ),
  );

  // Un integrante nuevo arranca con todos los servicios de la sede
  // marcados (lo que ya tiene guardado manda si es uno existente, aunque
  // los haya dejado todos desmarcados a propósito).
  const serviciosMarcadosPorDefecto = member
    ? assignedServiceIds
    : serviciosDeLaSede.map((s) => s.id);

  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/equipo"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nombre" name="name" errors={errors} required>
              <Input name="name" defaultValue={member?.name} required />
            </Field>

            <Field label="Cargo" name="role" errors={errors} required>
              <Input
                name="role"
                defaultValue={member?.role}
                placeholder="Estilista senior"
                required
              />
            </Field>
          </div>

          <Field
            label="Especialidad"
            name="specialty"
            errors={errors}
            required
            hint="Se muestra al pasar el cursor sobre la foto."
          >
            <Input
              name="specialty"
              defaultValue={member?.specialty}
              placeholder="Corte rizo a rizo y transición"
              required
            />
          </Field>

          <Field label="Bio corta" name="bio" errors={errors}>
            <Textarea name="bio" rows={3} defaultValue={member?.bio ?? ""} />
          </Field>

          <ImageField
            carpeta="equipo"
            name="imageUrl"
            label="Foto profesional"
            defaultValue={member?.imageUrl}
            errors={errors}
            hint="Vertical, recomendado 1200 × 1600."
            aspect="3/4"
          />

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Instagram" name="instagram" errors={errors}>
              <Input
                name="instagram"
                defaultValue={member?.instagram ?? ""}
                placeholder="https://instagram.com/…"
              />
            </Field>

            {branches.length > 1 ? (
              <Field label="Local" name="branchId" errors={errors}>
                <Select
                  name="branchId"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">Sin local</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.city}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="branchId" value={branchId} />
            )}

            <Field label="Orden" name="order" errors={errors}>
              <Input name="order" type="number" defaultValue={member?.order ?? 0} />
            </Field>
          </div>

          <Toggle
            name="active"
            label="Visible en el sitio"
            defaultChecked={member?.active ?? true}
          />

          <div>
            <p className="mb-1 text-[11px] tracking-[0.12em] text-muted uppercase">
              Horario semanal
            </p>
            <p className="t-small mb-3">
              Cuándo está disponible para que le asignemos citas — no cuándo
              abre el local.
            </p>
            <div className="space-y-2">
              {DIAS.map((dia, weekday) => {
                const propio = schedule.find((s) => s.weekday === weekday);
                const sugerido = businessHours.find(
                  (h) => h.branchId === branchId && h.weekday === weekday,
                );
                const base = propio ?? sugerido;
                return (
                  <div
                    key={weekday}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-stone bg-white px-4 py-3"
                  >
                    <span className="w-24 shrink-0 text-sm text-ink">{dia}</span>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        name={`weekday-${weekday}-closed`}
                        defaultChecked={base?.closed ?? weekday === 0}
                        className="h-4 w-4 accent-marea"
                      />
                      No trabaja
                    </label>
                    <div className="w-32">
                      <Input
                        type="time"
                        name={`weekday-${weekday}-opensAt`}
                        defaultValue={base?.opensAt ?? "09:00"}
                      />
                    </div>
                    <span className="text-sm text-muted">última cita</span>
                    <div className="w-32">
                      <Input
                        type="time"
                        name={`weekday-${weekday}-closesAt`}
                        defaultValue={base?.closesAt ?? "18:00"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] tracking-[0.12em] text-muted uppercase">
              Servicios que realiza
            </p>
            <p className="t-small mb-3">
              Se usa para asignar profesional automáticamente cuando alguien
              agende. Empiezan todos marcados — desmarca los que no haga.
            </p>
            <CheckboxGroup
              key={branchId}
              name="serviceIds"
              groups={grupos}
              defaultValues={serviciosMarcadosPorDefecto}
              emptyHint="Elige un local arriba para ver sus servicios."
            />
          </div>
        </>
      )}
    </AdminForm>
  );
}
