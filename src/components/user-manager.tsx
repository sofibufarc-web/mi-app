"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  sendPasswordResetAction,
  createUserAction,
  deleteUserAction,
  toggleUserActiveAction,
  type FormState,
} from "@/app/admin/actions";
import type { AppUser } from "@/data/types";

/**
 * ABM de usuarios, con el mismo patrón que `category-manager.tsx`: una fila por
 * usuario que se despliega en un panel de contraseña o de borrado, y nunca dos
 * paneles abiertos a la vez.
 *
 * Ojo con lo que este componente NO hace: no decide nada. Las reglas —no
 * borrarse a sí mismo, no dejar la tienda sin ningún admin, largo mínimo de la
 * contraseña— las aplica el servidor en `src/app/admin/actions.ts`. Acá solo se
 * ocultan los botones que igual iban a fallar, para no ofrecer un camino que
 * termina en error.
 */

type OpenState = { id: string; mode: "password" | "delete" } | null;

const inputClass =
  "h-10 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-semibold text-ink-soft";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

function Mensajes({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.message}
        </p>
      )}
    </>
  );
}

/** Alta. La contraseña se elige acá y no se puede volver a ver: solo cambiar. */
function NewUserForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(createUserAction, {
    error: null,
  });

  // Cuando la action confirma, `router.refresh()` le pide a Next que vuelva a
  // renderizar los Server Components de esta ruta con la lista actualizada.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Email *</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Contraseña * (mínimo 8)</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          // "new-password" evita que el navegador ofrezca la contraseña del
          // admin que está creando la cuenta.
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Rol *</span>
        <select name="role" defaultValue="cliente" className={inputClass}>
          <option value="cliente">Cliente — ve precios y arma pedidos</option>
          <option value="admin">Admin — además entra al panel</option>
        </select>
      </label>

      <div className="sm:col-span-3">
        <Mensajes state={state} />
      </div>

      <div className="flex gap-2 sm:col-span-3">
        <SubmitButton label="Crear cuenta" />
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-md border border-line bg-card px-5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Restablecer la contraseña de otra cuenta.
 *
 * Antes este panel tenía un campo para escribirle una contraseña nueva. Ya no:
 * las contraseñas las guarda Supabase Auth y el panel no puede ponerle una a
 * otra cuenta. Manda un link de un solo uso al email de la persona, que es
 * además lo correcto: su contraseña no tiene por qué pasar por manos ajenas.
 */
function PasswordPanel({ user, onCancel }: { user: AppUser; onCancel: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(
    sendPasswordResetAction,
    { error: null },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />

      <p className="max-w-prose text-sm text-ink-soft">
        Le vamos a mandar a <strong className="text-ink">{user.email}</strong> un
        link para que elija una contraseña nueva. El link sirve una sola vez y
        vence en una hora.
      </p>

      <p className="max-w-prose text-xs text-ink-soft">
        Si el mail no llega: el servidor de correo que trae Supabase por defecto
        manda muy pocos por hora y solo a integrantes del proyecto. Para usarlo
        con clientes reales hay que configurar un SMTP propio en el panel de
        Supabase.
      </p>

      <Mensajes state={state} />

      <div className="flex gap-2">
        <SubmitButton label="Mandar link" />
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-line bg-card px-5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DeletePanel({ user, onCancel }: { user: AppUser; onCancel: () => void }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(deleteUserAction, {
    error: null,
  });

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />

      <p className="text-sm">
        ¿Confirmás que querés borrar a <strong>{user.email}</strong>? Si es
        algo temporal, conviene desactivarlo: queda el rastro de que existió.
      </p>

      <Mensajes state={state} />

      <div className="flex gap-2">
        <button
          type="submit"
          className="h-10 rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Eliminar usuario
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-line bg-card px-5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Botón de activar / desactivar. Es un form propio porque escribe en la base. */
function ToggleActiveForm({ user }: { user: AppUser }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(
    toggleUserActiveAction,
    { error: null },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="active" value={user.active ? "false" : "true"} />
      <button
        type="submit"
        title={state.error ?? undefined}
        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
          state.error
            ? "border-red-300 text-red-600"
            : "border-line hover:bg-surface"
        }`}
      >
        {user.active ? "Desactivar" : "Activar"}
      </button>
    </form>
  );
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: AppUser[];
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState<OpenState>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-card p-5">
        {creating ? (
          <>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">
              Nuevo usuario
            </h2>
            <NewUserForm onDone={() => setCreating(false)} />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
        {users.map((user) => {
          const isPassword = open?.id === user.id && open.mode === "password";
          const isDeleting = open?.id === user.id && open.mode === "delete";
          const esYo = user.id === currentUserId;

          return (
            <li key={user.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {user.email}
                    {esYo && (
                      <span className="ml-2 text-xs font-normal text-ink-soft">
                        (sos vos)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {user.role === "admin" ? "Admin" : "Cliente"} ·{" "}
                    {user.active ? "activo" : "desactivado"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpen(isPassword ? null : { id: user.id, mode: "password" })
                    }
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface"
                  >
                    {isPassword ? "Cerrar" : "Restablecer"}
                  </button>

                  {/* Sobre uno mismo no se ofrecen: el servidor los rechaza. */}
                  {!esYo && (
                    <>
                      <ToggleActiveForm user={user} />
                      <button
                        type="button"
                        onClick={() =>
                          setOpen(isDeleting ? null : { id: user.id, mode: "delete" })
                        }
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isPassword && (
                <div className="mt-4 border-t border-line pt-4">
                  <PasswordPanel user={user} onCancel={() => setOpen(null)} />
                </div>
              )}

              {isDeleting && (
                <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-4">
                  <DeletePanel user={user} onCancel={() => setOpen(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
