"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteCategoryAction,
  saveCategoryAction,
  type FormState,
} from "@/app/admin/actions";
import type { Category } from "@/data/types";

/**
 * ABM de categorías en una sola pantalla.
 *
 * Cada fila se puede desplegar en un formulario de edición o en un panel de
 * borrado. El estado `open` guarda qué fila está abierta y en qué modo, así
 * nunca hay dos formularios abiertos a la vez.
 */

type CategoryWithCount = Category & { productCount: number };
type OpenState = { id: string; mode: "edit" | "delete" } | null;

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-semibold text-ink-soft";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

/** Formulario compartido por el alta y la edición. */
function CategoryFields({
  category,
  onCancel,
}: {
  category?: Category;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(
    saveCategoryAction,
    { error: null },
  );

  // Cuando la action confirma que guardó, `router.refresh()` le pide a Next que
  // vuelva a renderizar los Server Components de esta ruta con los datos nuevos.
  // Sin esto habría que recargar la página a mano para ver la lista actualizada.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {category && <input type="hidden" name="id" value={category.id} />}

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Nombre *</span>
        <input
          name="name"
          required
          defaultValue={category?.name}
          placeholder="Impermeabilizantes"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Orden en el menú</span>
        <input
          name="order"
          inputMode="numeric"
          defaultValue={category?.order ?? ""}
          placeholder="1"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelClass}>Descripción</span>
        <input
          name="description"
          defaultValue={category?.description ?? ""}
          placeholder="Membranas líquidas, vendas y mantas asfálticas."
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelClass}>Imagen (path público, opcional)</span>
        <input
          name="image"
          defaultValue={category?.image ?? ""}
          placeholder="/img/categorias/impermeabilizantes.svg"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="sm:col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="sm:col-span-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.message}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton label={category ? "Guardar cambios" : "Crear categoría"} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-line bg-white px-5 text-sm font-medium transition hover:bg-surface"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Panel de borrado.
 *
 * Si la categoría tiene productos NO la borramos sin más: mostramos cuántos son
 * y obligamos a elegir a dónde van (otra categoría o "sin categoría"). El
 * chequeo se repite en el servidor, así que no alcanza con saltearse la UI.
 */
function DeletePanel({
  category,
  categories,
  onCancel,
}: {
  category: CategoryWithCount;
  categories: CategoryWithCount[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(
    deleteCategoryAction,
    { error: null },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const others = categories.filter((c) => c.id !== category.id);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={category.id} />
      <input type="hidden" name="confirm" value="true" />

      {category.productCount > 0 ? (
        <>
          <p className="text-sm">
            <strong>{category.productCount} producto(s)</strong> están en esta
            categoría. Elegí a dónde moverlos antes de borrarla.
          </p>
          <label className="flex max-w-sm flex-col gap-1">
            <span className={labelClass}>Mover los productos a</span>
            <select name="reassignTo" defaultValue="" className={inputClass}>
              <option value="">— Sin categoría —</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p className="text-sm">
          Esta categoría no tiene productos. ¿Confirmás que querés borrarla?
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="h-10 rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Eliminar categoría
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-md border border-line bg-white px-5 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function CategoryManager({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [open, setOpen] = useState<OpenState>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5">
        {creating ? (
          <>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">
              Nueva categoría
            </h2>
            <CategoryFields onCancel={() => setCreating(false)} />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            + Nueva categoría
          </button>
        )}
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
        {categories.map((category) => {
          const isEditing = open?.id === category.id && open.mode === "edit";
          const isDeleting = open?.id === category.id && open.mode === "delete";

          return (
            <li key={category.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{category.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    /{category.slug} · orden {category.order} ·{" "}
                    {category.productCount} producto(s)
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpen(isEditing ? null : { id: category.id, mode: "edit" })
                    }
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface"
                  >
                    {isEditing ? "Cerrar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpen(isDeleting ? null : { id: category.id, mode: "delete" })
                    }
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 border-t border-line pt-4">
                  <CategoryFields
                    category={category}
                    onCancel={() => setOpen(null)}
                  />
                </div>
              )}

              {isDeleting && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50/50 p-4">
                  <DeletePanel
                    category={category}
                    categories={categories}
                    onCancel={() => setOpen(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
