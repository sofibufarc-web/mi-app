import type { Role } from "@/data/types";

/**
 * Quién es el visitante, y qué puede hacer.
 * ---------------------------------------------------------------------------
 * Acá ya no hay criptografía. Antes este archivo firmaba y verificaba una cookie
 * a mano; ahora de la sesión se ocupa **Supabase Auth**, que emite y renueva sus
 * propios tokens. Lo que queda son las dos reglas de la aplicación, que Supabase
 * no puede conocer porque son del negocio y no de la autenticación.
 *
 * Están en funciones propias y no escritas sueltas por ahí para que el día que
 * cambien haya un solo lugar donde tocar. Son dos líneas cada una a propósito.
 *
 * Dónde vive cada cosa ahora:
 *
 * - Iniciar y cerrar sesión → `src/app/actions/auth.ts`
 * - Leer la sesión en el servidor → `getSession()` de `src/lib/request-context.ts`
 * - Renovar el token en cada request → `src/proxy.ts`
 * - El rol de cada cuenta → tabla `public.profiles`, vía `src/lib/data-source.ts`
 */

/** La sesión resuelta de un request: la cuenta de Auth más su rol. */
export type Session = {
  /** UUID de la cuenta en Supabase Auth. */
  userId: string;
  email: string;
  role: Role;
};

/**
 * ¿Este rol puede ver precios y armar pedidos?
 *
 * Hoy la respuesta es "cualquiera que haya iniciado sesión", pero está en una
 * función propia para que el día que existan listas mayorista y minorista se
 * cambie en un solo lugar.
 */
export function canSeePrices(role: Role | null): boolean {
  return role !== null;
}

/** ¿Este rol puede entrar al panel? */
export function canManageStore(role: Role | null): boolean {
  return role === "admin";
}
