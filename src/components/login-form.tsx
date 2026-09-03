"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n";

/**
 * `useActionState` conecta el <form> con una Server Action y guarda lo que la
 * action devuelve (acá, el mensaje de error) para poder mostrarlo.
 *
 * `useFormStatus` tiene que estar en un componente HIJO del <form>: lee si el
 * formulario se está enviando para deshabilitar el botón. Por eso el botón es
 * un componente aparte.
 */
function SubmitButton({ t }: { t: Dictionary }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? t.login.submitting : t.login.submit}
    </button>
  );
}

export function LoginForm({ next, t }: { next: string; t: Dictionary }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {
    error: null,
  });

  const fieldClass =
    "h-11 rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">{t.login.user}</span>
        <input
          name="user"
          required
          autoComplete="username"
          autoFocus
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">
          {t.login.password}
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={fieldClass}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="animate-fade-up rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <SubmitButton t={t} />
    </form>
  );
}
