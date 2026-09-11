"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const LARGO_MINIMO = 8;

/**
 * El formulario de "elegí una contraseña nueva".
 *
 * Tres estados posibles al entrar:
 *
 * - **comprobando**: el cliente de Supabase está leyendo el token del fragmento
 *   de la URL. Dura un instante, pero sin este estado se vería parpadear el
 *   cartel de "link inválido" antes de que termine de leer.
 * - **listo**: hay sesión de recuperación, se puede elegir la contraseña.
 * - **sin-token**: alguien entró a la dirección de una, o el link ya venció.
 */
type Estado = "comprobando" | "listo" | "sin-token";

export function UpdatePasswordForm() {
  const router = useRouter();
  // `useMemo` para que el cliente se cree una sola vez. Sin esto, cada
  // renderizado armaría uno nuevo y el de la primera vez —el que leyó el token—
  // se perdería.
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [estado, setEstado] = useState<Estado>("comprobando");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    /*
     * `onAuthStateChange` y no una sola lectura: leer la sesión al montar suele
     * llegar temprano, porque el cliente todavía está canjeando el token del
     * fragmento. El evento avisa cuando terminó.
     *
     * El `getSession()` de abajo cubre el caso contrario, que el canje ya haya
     * terminado antes de que nos suscribamos y el evento no vuelva a dispararse.
     */
    const { data } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!cancelado && session) setEstado("listo");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelado) return;
      setEstado(session ? "listo" : "sin-token");
    });

    return () => {
      cancelado = true;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    if (password.length < LARGO_MINIMO) {
      setError(`La contraseña tiene que tener al menos ${LARGO_MINIMO} caracteres.`);
      return;
    }
    if (password !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: fallo } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (fallo) {
      setError(fallo.message);
      return;
    }

    // Se cierra la sesión de recuperación: sirvió para este único paso. Que
    // entre de nuevo con la contraseña que acaba de elegir, que además es la
    // forma de comprobar que quedó bien.
    await supabase.auth.signOut();
    setListo(true);
    router.refresh();
  }

  const campo =
    "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  if (estado === "comprobando") {
    return <p className="text-sm text-ink-soft">Comprobando el link…</p>;
  }

  if (estado === "sin-token") {
    return (
      <p
        role="alert"
        className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
      >
        Este link no es válido o ya venció. Pedile a quien te dio el acceso que
        te mande uno nuevo.
      </p>
    );
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Contraseña guardada.
        </p>
        <a
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-md bg-brand text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
        >
          Ingresar
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">
          Contraseña nueva (mínimo {LARGO_MINIMO})
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={LARGO_MINIMO}
          autoComplete="new-password"
          autoFocus
          className={campo}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Repetila</span>
        <input
          type="password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          required
          autoComplete="new-password"
          className={campo}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
