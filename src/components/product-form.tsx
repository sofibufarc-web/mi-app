"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  "h-11 w-full rounded-md border border-line bg-card px-3 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-semibold text-ink-soft";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}
    </button>
  );
}

/**
 * Campo de stock con botón de "sin stock".
 *
 * No hay una columna nueva: la tienda ya entiende `stock === 0` como agotado
 * (cartel en la tarjeta, variante tachada en la ficha). El botón solo escribe
 * 0 en el input; se guarda recién al apretar "Guardar cambios".
 * Vacío significa "no se controla stock" (el producto siempre figura disponible).
 */
function StockField({ initial }: { initial?: number | null }) {
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const soldOut = value.trim() !== "" && Number(value) === 0;
  const tracked = value.trim() !== "";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={labelClass}>Stock</span>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
            soldOut
              ? "bg-red-500/15 text-red-600 dark:text-red-400"
              : "bg-brand-soft text-brand"
          }`}
        >
          {soldOut
            ? "Sin stock"
            : tracked
              ? `${value} en stock`
              : "Disponible (no se controla)"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          name="stock"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Vacío = no se controla"
          className={`${inputClass} sm:max-w-48`}
        />
        <button
          type="button"
          onClick={() => setValue("0")}
          disabled={soldOut}
          className="h-11 rounded-md border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
        >
          Marcar sin stock
        </button>
        <button
          type="button"
          onClick={() => setValue("")}
          disabled={!tracked}
          className="h-11 rounded-md border border-line bg-card px-4 text-sm font-medium transition hover:bg-card/70 disabled:opacity-50"
        >
          Volver a disponible
        </button>
      </div>
      <p className="text-[11px] text-ink-soft">
        Con 0 la tienda muestra “Sin stock” en este artículo. Los botones
        cambian el campo; se aplica al apretar “Guardar cambios”.
      </p>
    </div>
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

      <section className="rounded-lg border border-line bg-card p-5">
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

          <StockField initial={product?.stock} />

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelClass}>Descripción</span>
            <textarea
              name="description"
              rows={7}
              defaultValue={product?.description}
              placeholder={
                "Un párrafo por bloque.\n\nDejá una línea en blanco entre párrafos: así se muestran separados en la ficha del producto."
              }
              className="w-full rounded-md border border-line bg-card p-3 text-sm leading-relaxed outline-none focus:border-brand"
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

      <section className="rounded-lg border border-line bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Imágenes</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          La primera es la principal: es la que se ve en la grilla del catálogo.
        </p>
        <ImageUploader initial={product?.images ?? []} />
      </section>

      {state.error && (
        <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton editing={Boolean(product)} />
        <Link
          href="/admin/productos"
          className="flex h-11 items-center rounded-md border border-line bg-card px-6 text-sm font-medium transition hover:bg-surface"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
