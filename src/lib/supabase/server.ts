import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client-config";

/**
 * Cliente de Supabase Auth para el servidor (páginas, layouts y Server Actions).
 *
 * ## Qué hace este cliente y qué no
 *
 * Solo se ocupa de **quién es el visitante**: iniciar sesión, cerrarla y leer la
 * sesión actual. Los datos de la tienda (productos, categorías, perfiles) NO
 * pasan por acá: siguen saliendo de `src/lib/data-source.ts`, que habla directo
 * con Postgres. Son dos caminos a la misma base, cada uno para lo suyo.
 *
 * ## Las cookies
 *
 * La sesión de Supabase vive en cookies. El cliente necesita poder leerlas y
 * escribirlas, y en Next eso se hace distinto según dónde corra el código:
 *
 * - En una **Server Action** o un route handler se pueden escribir, y por eso
 *   `setAll` funciona: es donde el login guarda la sesión recién creada.
 * - En un **Server Component** (una página) Next PROHÍBE escribir cookies,
 *   porque para cuando se renderiza ya salieron los headers de la respuesta.
 *   Ahí `cookieStore.set` tira una excepción.
 *
 * De ahí el try/catch vacío, que a primera vista parece un error. No lo es: en
 * una página no hay nada que guardar, porque el refresco del token ya lo hizo el
 * proxy antes de llegar (ver `src/proxy.ts`). Sin el catch, cualquier página que
 * cayera justo en el momento de renovar el token explotaría.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: no se pueden escribir cookies acá. Ver arriba.
        }
      },
    },
  });
}
