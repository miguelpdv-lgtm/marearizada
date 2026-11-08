"use client";

import { useActionState } from "react";

import { loginAction } from "./actions";
import { Field, FormAlert, Input, SubmitButton } from "@/components/admin/form";
import type { ActionState } from "@/lib/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, {} as ActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-10">
      <FormAlert state={state} />

      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-5">
        <Field label="Correo" name="email" errors={errors} required>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="tucorreo@marearizada.com"
            required
            autoFocus
          />
        </Field>

        <Field label="Contraseña" name="password" errors={errors} required>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>
      </div>

      <SubmitButton className="mt-8 w-full">Entrar al panel</SubmitButton>
    </form>
  );
}
