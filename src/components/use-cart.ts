"use client";

import { useSyncExternalStore } from "react";

import type { CartItem } from "@/data/types";
import * as cartStore from "@/lib/cart-store";

/**
 * Hook para usar el carrito desde cualquier Client Component.
 *
 * `useSyncExternalStore` es la API de React para leer estado que vive fuera de
 * React (acá, `localStorage` a través de `src/lib/cart-store.ts`). Se suscribe
 * al store y vuelve a renderizar cuando cambia.
 *
 * No hace falta ningún <CartProvider> envolviendo la app: el store es un módulo,
 * y todos los componentes que llaman a este hook leen exactamente lo mismo.
 */
export type UseCartResult = {
  items: CartItem[];
  /** false hasta que se leyó localStorage. Sirve para no mostrar "carrito vacío" de más. */
  ready: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

export function useCart(): UseCartResult {
  const { items, ready } = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    // Tercer argumento: qué devolver durante el render en el servidor.
    cartStore.getServerSnapshot,
  );

  return {
    items,
    ready,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    addItem: cartStore.addItem,
    updateQuantity: cartStore.updateQuantity,
    removeItem: cartStore.removeItem,
    clear: cartStore.clear,
  };
}
