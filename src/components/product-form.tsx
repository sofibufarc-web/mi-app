"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveProductAction, type FormState } from "@/app/admin/actions";
import { ImageUploader } from "@/components/image-uploader";
import type { Category, Product } from "@/data/types";

/**
 * Formulario de alta y edición de producto.
 *
 * Un solo componente para las dos cosas: si recibe `product` edita (manda el
 * id en un input oculto), si no, crea. Así no hay dos formularios que
 * mantener sincronizados.
 */

const inputClass =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-semibold text-ink-soft";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
    </button>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    saveProductAction,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Datos básicos</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelClass}>Nombre *</span>
            <input
              name="name"
              required
              defaultValue={product?.name}
              placeholder="Látex Interior Recuplast 20 L"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Código / SKU *</span>
            <input
              name="sku"
              required
              defaultValue={product?.sku}
              placeholder="SIN-1020"
              className={inputClass}
            />
            <span className="text-[11px] text-ink-soft">
              Es la clave que usa la carga de precios por Excel.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Precio *</span>
            <input
              name="price"
              required
              inputMode="decimal"
              defaultValue={product?.price ?? ""}
              placeholder="89900"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Categoría</span>
            <select
              name="categoryId"
              defaultValue={product?.categoryId ?? ""}
              className={inputClass}
            >
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Marca</span>
            <input
              name="brand"
              defaultValue={product?.brand ?? ""}
              placeholder="Sinteplast"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Presentación / unidad</span>
            <input
              name="unit"
              defaultValue={product?.unit ?? ""}
              placeholder="balde 20 L"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Stock (opcional)</span>
            <input
              name="stock"
              inputMode="numeric"
              defaultValue={product?.stock ?? ""}
              placeholder="Vacío = no se controla"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelClass}>Descripción</span>
            <textarea
              name="description"
              rows={7}
              defaultValue={product?.description}
              placeholder={
                "Un párrafo por bloque.\n\nDejá una línea en blanco entre párrafos: así se muestran separados en la ficha del producto."
              }
              className="w-full rounded-md border border-line bg-white p-3 text-sm leading-relaxed outline-none focus:border-brand"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product ? product.active : true}
              className="h-4 w-4 accent-[#113bc2]"
            />
            Visible en el catálogo
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product?.featured ?? false}
              className="h-4 w-4 accent-[#113bc2]"
            />
            Destacado (aparece en la home)
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Imágenes</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          La primera es la principal: es la que se ve en la grilla del catálogo.
        </p>
        <ImageUploader initial={product?.images ?? []} />
      </section>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton editing={Boolean(product)} />
        <Link
          href="/admin/productos"
          className="flex h-11 items-center rounded-md border border-line bg-white px-6 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
