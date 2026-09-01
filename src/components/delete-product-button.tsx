"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { deleteProductAction, type FormState } from "@/app/admin/actions";

/**
 * Botón de borrado con confirmación.
 *
 * `onSubmit` corre antes de que el form llame a la Server Action: si el usuario
 * cancela el `confirm()`, hacemos `preventDefault()` y no se manda nada.
 * Borrar es difícil de revertir, así que siempre se pregunta.
 */
function Button({ name }: { name: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      aria-label={`Eliminar ${name}`}
    >
      {pending ? "Borrando…" : "Eliminar"}
    </button>
  );
}

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    deleteProductAction,
    { error: null },
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button name={name} />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
