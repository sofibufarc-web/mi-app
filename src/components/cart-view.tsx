"use client";

import Link from "next/link";

import { useCart } from "@/components/use-cart";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";

/** Vista del carrito: editar cantidades, eliminar ítems y ver el total. */
export function CartView() {
  const { items, ready, totalItems, totalPrice, updateQuantity, removeItem, clear } =
    useCart();

  // Mientras leemos localStorage mostramos un esqueleto, no "carrito vacío":
  // si no, se vería un parpadeo feo en cada carga.
  if (!ready) {
    return <div className="h-40 animate-pulse rounded-lg bg-surface" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
        <p className="font-semibold">Tu carrito está vacío</p>
        <p className="mt-1 text-sm text-ink-soft">
          Agregá productos del catálogo para armar tu pedido.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 p-4">
            <Link
              href={`/producto/${item.slug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-line bg-surface"
            >
              <ProductImage src={item.image} alt={item.name} sizes="80px" />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/producto/${item.slug}`}
                className="text-sm font-medium hover:text-brand"
              >
                {item.name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-soft">Cód. {item.sku}</p>
              <p className="mt-1 text-sm font-semibold text-brand">
                {formatPrice(item.price)}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center rounded-md border border-line">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label={`Quitar una unidad de ${item.name}`}
                    className="h-9 w-9 text-ink-soft transition hover:bg-surface"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.productId, Number(e.target.value) || 0)
                    }
                    aria-label={`Cantidad de ${item.name}`}
                    className="h-9 w-12 border-x border-line text-center text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    aria-label={`Agregar una unidad de ${item.name}`}
                    className="h-9 w-9 text-ink-soft transition hover:bg-surface"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-xs font-medium text-ink-soft underline transition hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <p className="shrink-0 text-sm font-bold">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-40">
        <h2 className="text-sm font-bold uppercase tracking-wide">Resumen</h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Artículos</dt>
            <dd className="font-semibold">{totalItems}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-semibold">{formatPrice(totalPrice)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex justify-between border-t border-line pt-4">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold text-brand">
            {formatPrice(totalPrice)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">IVA no incluido.</p>

        <Link
          href="/checkout"
          className="mt-5 block rounded-md bg-brand py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Finalizar pedido
        </Link>

        <button
          type="button"
          onClick={clear}
          className="mt-2 w-full rounded-md border border-line bg-white py-2.5 text-sm font-medium text-ink-soft transition hover:bg-surface"
        >
          Vaciar carrito
        </button>
      </aside>
    </div>
  );
}
