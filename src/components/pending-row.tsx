"use client";

import { useActionState } from "react";

import { assignPendingAction, type FormState } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";

const inicial: FormState = { error: null };

/** Un código nuevo: se elige a qué producto pertenece (o se crea uno propio). */
export function PendingRow({
  product,
  parents,
}: {
  product: { id: string; sku: string; name: string; price: number };
  parents: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(assignPendingAction, inicial);
  const campo = "h-9 rounded-md border border-line bg-card px-2 text-sm";

  if (state.ok) {
    return (
      <li className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        {product.sku} · {product.name}: {state.message}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-line bg-card p-4">
      <p className="text-sm">
        <span className="font-mono font-semibold">{product.sku}</span> · {product.name} ·{" "}
        <span className="font-semibold">{formatPrice(product.price)}</span>
      </p>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="productId" value={product.id} />
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Producto
          <select name="parentId" className={`${campo} w-64`} defaultValue="">
            <option value="">➕ Crear un producto nuevo</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Color
          <input name="color" className={`${campo} w-32`} placeholder="Amarillo" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Tamaño
          <input name="sizeLabel" className={`${campo} w-24`} placeholder="1 lt" />
        </label>
        <button disabled={pending} className="btn-primary h-9 text-sm">
          {pending ? "Guardando…" : "Asignar y publicar"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
    </li>
  );
}
