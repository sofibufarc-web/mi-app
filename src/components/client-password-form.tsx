"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  changeClientPasswordAction,
  type FormState,
} from "@/app/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Cambiar contraseña"}
    </button>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-brand";

/**
 * Formulario para cambiar la contraseña compartida de los clientes.
 *
 * `type="text"` a propósito: es una clave que el admin tiene que poder leer y
 * dictarle a los clientes, y verla al escribirla evita errores de tipeo. Los
 * campos se limpian solos al terminar la action, así que no queda a la vista.
 */
export function ClientPasswordForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    changeClientPasswordAction,
    { error: null },
  );

  if (!configured) {
    return (
      <p className="rounded-md border border-line bg-surface p-3 text-sm text-ink-soft">
        Falta configurar la variable <code>CLIENT_LOGIN_EMAIL</code> en el
        servidor (ver <code>.env.example</code>).
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-soft">
            Contraseña nueva
          </span>
          <input
            name="password"
            type="text"
            required
            minLength={10}
            autoComplete="off"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-soft">Repetila</span>
          <input
            name="repeat"
            type="text"
            required
            minLength={10}
            autoComplete="off"
            className={inputClass}
          />
        </label>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p
          role="status"
          className="rounded-md border border-brand/30 bg-brand/10 p-3 text-sm"
        >
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
