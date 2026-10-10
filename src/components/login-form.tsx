"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  loginAction,
  loginClienteAction,
  type LoginState,
} from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n";

/**
 * `useActionState` conecta el <form> con una Server Action y guarda lo que la
 * action devuelve (acá, el mensaje de error y el usuario tipeado) para poder
 * mostrarlo.
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

/** Ojo abierto / ojo tachado. Dibujados con `currentColor`, heredan el color. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="m4 20 16-16" />}
    </svg>
  );
}

/**
 * Un solo formulario para los dos accesos.
 *
 * - `cliente`: solo contraseña. Es lo que pidió el cliente de la tienda.
 * - `admin`: email + contraseña, para entrar al panel.
 *
 * Cada modo llama a una Server Action distinta; el modo NO viaja como dato del
 * formulario, porque entonces cualquiera podría cambiarlo desde el inspector.
 */
export function LoginForm({
  next,
  t,
  modo = "cliente",
}: {
  next: string;
  t: Dictionary;
  modo?: "cliente" | "admin";
}) {
  const esAdmin = modo === "admin";
  const [state, formAction] = useActionState<LoginState, FormData>(
    esAdmin ? loginAction : loginClienteAction,
    {
      error: null,
      email: "",
    },
  );

  /**
   * El campo de email es CONTROLADO (su valor sale de este estado de React).
   * Es lo que hace que sobreviva a un intento fallido: cuando una Server Action
   * termina, React resetea los campos del formulario, y un campo no controlado
   * volvería a quedar vacío. Uno controlado conserva el valor de React.
   *
   * El valor inicial sale de `state.email`, que es lo que devolvió el servidor.
   * Eso cubre el caso de que el JavaScript todavía no haya cargado: ahí el
   * formulario se envía a la vieja usanza, la página se vuelve a renderizar
   * entera y el email igual aparece escrito.
   *
   * La contraseña NO se conserva: es lo que probablemente estuvo mal, y dejar
   * una clave escrita en pantalla después de un error no aporta nada.
   */
  const [email, setEmail] = useState(state.email);

  /** ¿La contraseña se está mostrando en texto plano? */
  const [showPassword, setShowPassword] = useState(false);

  const fieldClass =
    "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {esAdmin && (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">{t.login.email}</span>
        <input
          name="email"
          // type="email" hace dos cosas en el celular: muestra el teclado con la
          // arroba a mano y valida el formato antes de enviar.
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          autoFocus
          className={fieldClass}
        />
      </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">
          {t.login.password}
        </span>
        {/* `relative` para poder apoyar el botón del ojo adentro del campo. */}
        <div className="relative">
          <input
            name="password"
            // Todo el truco del ojo es este atributo: "password" tapa los
            // caracteres con puntitos, "text" los muestra.
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            // En modo cliente no hay campo de email, así que el foco va acá.
            autoFocus={!esAdmin}
            // pr-11 reserva el lugar del botón para que el texto no se le meta abajo.
            className={`${fieldClass} pr-11`}
          />
          <button
            // `type="button"` es obligatorio: adentro de un <form>, un <button>
            // sin type es de tipo "submit" y tocarlo enviaría el formulario.
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            // El texto cambia según el estado, así un lector de pantalla anuncia
            // qué va a pasar si se toca, no qué está pasando ahora.
            aria-label={
              showPassword ? t.login.hidePassword : t.login.showPassword
            }
            aria-pressed={showPassword}
            title={showPassword ? t.login.hidePassword : t.login.showPassword}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-soft transition hover:bg-surface hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
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
