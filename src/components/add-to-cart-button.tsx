"use client";

import { useState } from "react";

import { useCart } from "@/components/use-cart";
import type { CartItem } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * Botón "Agregar al carrito".
 *
 * Recibe el producto ya aplanado como `CartItem` (sin cantidad) desde un Server
 * Component. Así el componente cliente no necesita saber nada de la capa de
 * datos: solo recibe props serializables.
 *
 * Los textos también llegan por props, ya traducidos. Es más simple que montar
 * un contexto de idioma: el componente que lo dibuja siempre es de servidor y
 * ya sabe en qué idioma está la página.
 *
 * Ojo con el tipo de `t`: pedimos `Dictionary["product"]` y no el diccionario
 * entero. Todo lo que un Server Component le pasa a un Client Component viaja
 * al navegador dentro del HTML, así que pedir de más significa mandar de más.
 * Con esta rebanada, en las páginas de catálogo no se descarga ni una palabra
 * del checkout ni del login.
 *
 * `withQuantity` agrega el selector de cantidad (lo usa la ficha de producto;
 * en la grilla alcanza con el botón solo).
 */
export function AddToCartButton({
  item,
  t,
  withQuantity = false,
  className = "",
}: {
  item: Omit<CartItem, "quantity">;
  t: Dictionary["product"];
  withQuantity?: boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(item, quantity);
    setAdded(true);
    // Feedback breve: el botón dice "Agregado ✓" por un segundo y vuelve.
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {withQuantity && (
        <div className="flex items-center rounded-md border border-line">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label={t.decreaseAria}
            className="h-11 w-11 text-lg text-ink-soft transition hover:bg-surface"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            aria-label={t.quantityAria}
            className="h-11 w-14 border-x border-line bg-transparent text-center font-semibold"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label={t.increaseAria}
            className="h-11 w-11 text-lg text-ink-soft transition hover:bg-surface"
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className={`flex-1 rounded-md px-4 text-sm font-semibold transition active:scale-[0.98] ${
          withQuantity ? "h-11" : "h-9"
        } ${
          added
            ? "bg-emerald-600 text-white"
            : "bg-brand text-on-brand hover:bg-brand-dark"
        }`}
      >
        {added ? t.added : t.addToCart}
      </button>
    </div>
  );
}
