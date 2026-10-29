"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setOrderStatusAction, type FormState } from "@/app/admin/actions";
import type { OrderStatus } from "@/data/types";

/**
 * Botones para mover un pedido de estado. Según dónde está hoy, ofrece solo los
 * pasos que tienen sentido: uno nuevo se puede atender o cancelar; uno cancelado
 * solo se puede reabrir. Nada pide confirmación porque todo se revierte con otro
 * click.
 */
const ACCIONES: Record<
  OrderStatus,
  Array<{ to: OrderStatus; label: string; primary?: boolean }>
> = {
  nuevo: [
    { to: "atendido", label: "Marcar como atendido", primary: true },
    { to: "cancelado", label: "Cancelar" },
  ],
  atendido: [
    { to: "nuevo", label: "Volver a nuevo" },
    { to: "cancelado", label: "Cancelar" },
  ],
  cancelado: [{ to: "nuevo", label: "Reabrir como nuevo" }],
};

function Boton({ label, primary }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        primary
          ? "bg-brand text-on-brand hover:bg-brand-dark"
          : "border border-line hover:bg-surface"
      }`}
    >
      {pending ? "…" : label}
    </button>
  );
}

function Una({ id, to, label, primary }: { id: number; to: OrderStatus; label: string; primary?: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(setOrderStatusAction, {
    error: null,
  });
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <Boton label={label} primary={primary} />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function OrderStatusButtons({ id, status }: { id: number; status: OrderStatus }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCIONES[status].map((accion) => (
        <Una key={accion.to} id={id} {...accion} />
      ))}
    </div>
  );
}
