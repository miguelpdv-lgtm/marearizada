"use client";

import { useActionState } from "react";
import type { Setting } from "@prisma/client";

import { FormAlert, SubmitButton } from "@/components/admin/form";
import { updateSettings } from "./actions";
import type { ActionState } from "@/lib/actions";

const inputCls =
  "admin-control px-4 py-3 text-base";

export function SettingsGroupForm({
  group,
  settings,
}: {
  group: string;
  settings: Setting[];
}) {
  const action = updateSettings.bind(null, group);
  const [state, formAction] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction}>
      <FormAlert state={state} />

      <div className="grid gap-6 sm:grid-cols-2">
        {settings.map((setting) => (
          <div
            key={setting.key}
            className={
              setting.type === "TEXTAREA" || setting.type === "BOOLEAN"
                ? "sm:col-span-2"
                : ""
            }
          >
            {setting.type === "BOOLEAN" ? (
              <label className="flex cursor-pointer items-start gap-3 border border-stone bg-white px-4 py-3.5 hover:border-marea">
                <input
                  type="checkbox"
                  name={setting.key}
                  defaultChecked={setting.value === "true"}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-marea"
                />
                <span>
                  <span className="block text-sm font-normal text-ink">
                    {setting.label}
                  </span>
                  {setting.hint && (
                    <span className="mt-0.5 block text-xs text-muted">
                      {setting.hint}
                    </span>
                  )}
                </span>
              </label>
            ) : (
              <>
                <label
                  htmlFor={setting.key}
                  className="admin-label"
                >
                  {setting.label}
                </label>

                {setting.type === "TEXTAREA" ? (
                  <textarea
                    id={setting.key}
                    name={setting.key}
                    rows={3}
                    defaultValue={setting.value}
                    className={`${inputCls} resize-y leading-relaxed`}
                  />
                ) : (
                  <input
                    id={setting.key}
                    name={setting.key}
                    type={setting.type === "NUMBER" ? "number" : "text"}
                    defaultValue={setting.value}
                    className={inputCls}
                  />
                )}

                {setting.hint && (
                  <p className="mt-1.5 text-xs font-normal text-muted">
                    {setting.hint}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-stone/70 pt-6">
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </form>
  );
}
