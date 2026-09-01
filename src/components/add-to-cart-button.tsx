"use client";

import { useState } from "react";

import { useCart } from "@/components/use-cart";
import type { CartItem } from "@/data/types";

/**
 * Botón "Agregar al carrito".
 *
 * Recibe el producto ya aplanado como `CartItem` (sin cantidad) desde un Server
 * Component. Así el componente cliente no necesita saber nada de la capa de
 * datos: solo recibe props serializables.
 *
 * `withQuantity` agrega el selector de cantidad (lo usa la ficha de producto;
 * en la grilla alcanza con el botón solo).
 */
export function AddToCartButton({
  item,
  withQuantity = false,
  className = "",
}: {
  item: Omit<CartItem, "quantity">;
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
            aria-label="Quitar una unidad"
            className="h-11 w-11 text-lg text-ink-soft transition hover:bg-surface"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Cantidad"
            className="h-11 w-14 border-x border-line text-center font-semibold"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Agregar una unidad"
            className="h-11 w-11 text-lg text-ink-soft transition hover:bg-surface"
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="h-11 flex-1 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-[0.99]"
      >
        {added ? "Agregado ✓" : "Agregar al carrito"}
      </button>
    </div>
  );
}
