"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { toggleStockAction, type FormState } from "@/app/admin/actions";

/**
 * Botón rápido del listado: marca un producto como sin stock (stock = 0) o lo
 * devuelve a "disponible" (stock vacío = no se controla). No pide confirmación
 * porque se revierte con un click.
 */
function Button({ soldOut }: { soldOut: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        soldOut
          ? "border-line hover:bg-surface"
          : "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
      }`}
    >
      {pending ? "…" : soldOut ? "Disponible" : "Sin stock"}
    </button>
  );
}

export function StockToggleButton({ id, soldOut }: { id: string; soldOut: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(toggleStockAction, {
    error: null,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="sinStock" value={soldOut ? "0" : "1"} />
      <Button soldOut={soldOut} />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
