"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/actions/auth";

/**
 * `useActionState` conecta el <form> con una Server Action y guarda lo que la
 * action devuelve (acá, el mensaje de error) para poder mostrarlo.
 *
 * `useFormStatus` tiene que estar en un componente HIJO del <form>: lee si el
 * formulario se está enviando para deshabilitar el botón. Por eso el botón es
 * un componente aparte.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Ingresando…" : "Ingresar"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Usuario</span>
        <input
          name="user"
          required
          autoComplete="username"
          autoFocus
          className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
