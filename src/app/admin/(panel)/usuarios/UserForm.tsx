"use client";

import { useState } from "react";
import type { User } from "@prisma/client";

import {
  AdminForm,
  CheckboxGroup,
  Field,
  ImageField,
  Input,
  Select,
  Toggle,
} from "@/components/admin/form";
import { ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "@/lib/constants";
import type { ActionState } from "@/lib/actions";

export function UserForm({
  action,
  user,
  branchIds = [],
  branches,
  isSelf = false,
  submitLabel,
  extra,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  user?: User;
  /** Sedes ya asignadas (edición). */
  branchIds?: string[];
  branches: { id: string; city: string }[];
  isSelf?: boolean;
  submitLabel?: string;
  extra?: React.ReactNode;
}) {
  const editing = Boolean(user);
  const [role, setRole] = useState<Role>((user?.role as Role) ?? "STAFF");

  return (
    <AdminForm
      action={action}
      submitLabel={submitLabel}
      cancelHref="/admin/usuarios"
      extra={extra}
    >
      {(errors) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nombre completo" name="name" errors={errors} required>
              <Input name="name" defaultValue={user?.name} required />
            </Field>

            <Field label="Correo" name="email" errors={errors} required>
              <Input
                name="email"
                type="email"
                defaultValue={user?.email}
                autoComplete="off"
                required
              />
            </Field>
          </div>

          <Field
            label={editing ? "Nueva contraseña" : "Contraseña"}
            name="password"
            errors={errors}
            required={!editing}
            hint={
              editing
                ? "Déjala vacía para conservar la contraseña actual."
                : "Mínimo 8 caracteres."
            }
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={editing ? "••••••••" : ""}
              required={!editing}
            />
          </Field>

          <Field label="Rol" name="role" errors={errors} required>
            <Select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          {role === "ADMIN" ? (
            <p className="t-small">
              Los administradores tienen acceso a todo el panel.
            </p>
          ) : branches.length === 1 ? (
            <input type="hidden" name="branchIds" value={branches[0].id} />
          ) : (
            <Field label="Locales" name="branchIds" errors={errors} required>
              <CheckboxGroup
                name="branchIds"
                groups={[
                  {
                    label: "",
                    options: branches.map((b) => ({ value: b.id, label: b.city })),
                  },
                ]}
                defaultValues={branchIds}
                emptyHint="No hay locales activos todavía."
              />
            </Field>
          )}

          <div className="border border-stone/70 bg-sand/40 px-5 py-4">
            <p className="mb-2 text-[10px] tracking-[0.14em] text-muted uppercase">
              Qué puede hacer cada rol
            </p>
            <ul className="space-y-1.5">
              {ROLES.map((r) => (
                <li key={r} className="text-xs font-normal text-muted">
                  <span className="text-ink">{ROLE_LABEL[r]}:</span>{" "}
                  {ROLE_DESCRIPTION[r]}
                </li>
              ))}
            </ul>
          </div>

          <Field label="Teléfono" name="phone" errors={errors}>
            <Input
              name="phone"
              defaultValue={user?.phone ?? ""}
              className="max-w-xs"
            />
          </Field>

          <ImageField
            carpeta="equipo"
            name="avatarUrl"
            label="Foto de perfil"
            defaultValue={user?.avatarUrl}
            errors={errors}
            aspect="1/1"
          />

          <Toggle
            name="active"
            label="Usuario activo"
            hint={
              isSelf
                ? "No puedes desactivar tu propio usuario."
                : "Si lo desactivas, no podrá entrar al panel."
            }
            defaultChecked={user?.active ?? true}
            disabled={isSelf}
          />

          {isSelf && <input type="hidden" name="active" value="true" />}
        </>
      )}
    </AdminForm>
  );
}
