"use client";

import { useActionState, useState } from "react";
import type { Branch, TeamMember } from "@prisma/client";

import { Field, FormAlert, Input, Select, SubmitButton } from "@/components/admin/form";
import { crearBloqueo } from "./actions";
import type { ActionState } from "@/lib/actions";

/** Atajos para lo que más se bloquea: un festivo, una capacitación, un cierre. */
const ATAJOS = [
  { label: "Todo el día", todoElDia: true },
  { label: "Solo la mañana", todoElDia: false, inicio: "00:00", fin: "13:00" },
  { label: "Solo la tarde", todoElDia: false, inicio: "13:00", fin: "23:59" },
];

export function BloqueoForm({
  sedes,
  equipo,
  hoy,
}: {
  sedes: Branch[];
  equipo: Pick<TeamMember, "id" | "name" | "branchId">[];
  hoy: string;
}) {
  const [state, formAction] = useActionState(crearBloqueo, {} as ActionState);
  const errors = state.fieldErrors ?? {};

  const [todoElDia, setTodoElDia] = useState(true);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("18:30");
  const [desde, setDesde] = useState(hoy);
  const [branchId, setBranchId] = useState(sedes[0]?.id ?? "");

  const equipoDeLaSede = equipo.filter((m) => m.branchId === branchId);

  return (
    <form action={formAction}>
      <FormAlert state={state} />

      <div className="space-y-5">
        {/* Con un solo local no hay nada que elegir. */}
        {sedes.length === 1 && <input type="hidden" name="branchId" value={branchId} />}
        {sedes.length > 1 && (
        <Field label="Local" name="branchId" errors={errors} required>
          <Select
            name="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city}
              </option>
            ))}
            <option value="todas">Todos los locales</option>
          </Select>
        </Field>
        )}

        {branchId !== "todas" && (
          <Field
            label="A quién"
            name="staffId"
            errors={errors}
            hint="Todo el local bloquea Salón y Nails. Con alguien elegido, solo a esa persona."
          >
            <Select name="staffId" defaultValue="" key={branchId}>
              <option value="">Todo el local</option>
              {equipoDeLaSede.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde" name="desde" errors={errors} required>
            <Input
              name="desde"
              type="date"
              value={desde}
              min={hoy}
              onChange={(e) => setDesde(e.target.value)}
            />
          </Field>

          <Field
            label="Hasta"
            name="hasta"
            errors={errors}
            hint="Déjalo igual para un solo día. Con una franja, se bloquea esa franja cada día."
          >
            <Input name="hasta" type="date" defaultValue={desde} min={desde} key={desde} />
          </Field>
        </div>

        <div>
          <p className="admin-label">Franja</p>
          <div className="flex flex-wrap gap-2">
            {ATAJOS.map((a) => {
              const activo =
                a.todoElDia === todoElDia &&
                (a.todoElDia || (a.inicio === inicio && a.fin === fin));
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setTodoElDia(a.todoElDia);
                    if (!a.todoElDia) {
                      setInicio(a.inicio!);
                      setFin(a.fin!);
                    }
                  }}
                  aria-pressed={activo}
                  className="admin-chip"
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <input type="hidden" name="todoElDia" value={todoElDia ? "true" : "false"} />

        {!todoElDia && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora inicio" name="horaInicio" errors={errors}>
              <Input
                name="horaInicio"
                type="time"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </Field>
            <Field label="Hora fin" name="horaFin" errors={errors}>
              <Input
                name="horaFin"
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </Field>
          </div>
        )}

        {todoElDia && (
          <>
            <input type="hidden" name="horaInicio" value="00:00" />
            <input type="hidden" name="horaFin" value="23:59" />
          </>
        )}

        <Field
          label="Motivo"
          name="reason"
          errors={errors}
          hint="Solo lo ve el equipo. Ej.: festivo, capacitación, mantenimiento."
        >
          <Input name="reason" placeholder="Festivo" />
        </Field>
      </div>

      <div className="mt-7 border-t border-stone pt-5">
        <SubmitButton>Crear bloqueo</SubmitButton>
      </div>
    </form>
  );
}
