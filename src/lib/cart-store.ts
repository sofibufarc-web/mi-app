import { CART_STORAGE_KEY } from "@/config/site";
import type { CartItem } from "@/data/types";

/**
 * Carrito: estado global guardado en `localStorage`.
 *
 * ¿Por qué no un Context con useState?
 * El carrito vive FUERA de React: la fuente de verdad es `localStorage`. React
 * tiene una API pensada justo para eso, `useSyncExternalStore` (ver
 * `src/components/use-cart.ts`), que se conecta a un "store" externo como este.
 * Comparado con leer localStorage dentro de un `useEffect`, evita el renderizado
 * en cascada que React 19 desaconseja y, de yapa, mantiene el carrito
 * sincronizado entre varias pestañas abiertas.
 *
 * El contrato que pide `useSyncExternalStore` es de tres funciones:
 *   - subscribe(listener): avisa cuando el store cambia; devuelve cómo desuscribirse.
 *   - getSnapshot(): el estado actual. Tiene que devolver SIEMPRE la misma
 *     referencia mientras nada cambie, o React entra en un bucle de renders.
 *   - getServerSnapshot(): qué ve el servidor, donde no hay localStorage.
 */

export type CartState = {
  items: CartItem[];
  /** false hasta que se leyó localStorage. Evita parpadeos en el primer render. */
  ready: boolean;
};

/** En el servidor el carrito siempre está vacío. Constante = referencia estable. */
const SERVER_STATE: CartState = { items: [], ready: false };

let state: CartState = SERVER_STATE;
let loaded = false;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Reemplaza el estado, persiste y avisa. Una sola puerta de salida. */
function setItems(items: CartItem[], persist = true) {
  state = { items, ready: true };
  if (persist) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Modo incógnito o storage lleno: seguimos con el carrito en memoria.
    }
  }
  emit();
}

/**
 * Lee y valida lo que hay en localStorage. Puede estar corrupto, ser de una
 * versión vieja o directamente no existir, así que filtramos ítem por ítem.
 */
function readFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.productId === "string" &&
        typeof item.sku === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

/** Otra pestaña tocó el carrito: nos ponemos al día. */
function handleStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  setItems(readFromStorage(), false);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // La primera suscripción es el momento de leer localStorage: ya estamos en el
  // navegador y el HTML del servidor ya se hidrató, así que no hay desajuste.
  if (!loaded) {
    loaded = true;
    setItems(readFromStorage(), false);
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): CartState {
  return state;
}

export function getServerSnapshot(): CartState {
  return SERVER_STATE;
}

/* -------------------------------------------------------------------------- */
/* Operaciones                                                                 */
/* -------------------------------------------------------------------------- */

export function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
  const existing = state.items.find((i) => i.productId === item.productId);
  setItems(
    existing
      ? state.items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        )
      : [...state.items, { ...item, quantity }],
  );
}

/** Cantidad 0 o menos = sacar el ítem del carrito. */
export function updateQuantity(productId: string, quantity: number) {
  setItems(
    quantity <= 0
      ? state.items.filter((i) => i.productId !== productId)
      : state.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i,
        ),
  );
}

export function removeItem(productId: string) {
  setItems(state.items.filter((i) => i.productId !== productId));
}

export function clear() {
  setItems([]);
}
