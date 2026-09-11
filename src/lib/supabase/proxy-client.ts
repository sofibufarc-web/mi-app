import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client-config";

/**
 * Cliente de Supabase Auth para el proxy (`src/proxy.ts`), que corre en Edge.
 *
 * El proxy tiene dos trabajos con la sesión:
 *
 * 1. **Saber si hay sesión**, para cortar el paso a las rutas protegidas.
 * 2. **Renovar el token** cuando está por vencer. Los tokens de Supabase duran
 *    una hora; si nadie los renueva, la sesión se corta sola aunque la persona
 *    esté usando el sitio. El proxy es el único lugar que ve TODOS los requests,
 *    así que es donde corresponde hacerlo.
 *
 * El detalle incómodo: el proxy no sabe todavía qué respuesta va a devolver
 * (puede ser un `next()`, un redirect al login o un 401 en JSON), y las cookies
 * renovadas tienen que viajar en la que finalmente salga. Por eso este cliente
 * no escribe la respuesta: **junta** las cookies en una lista y quien llama las
 * vuelca sobre la respuesta que corresponda.
 *
 * No lleva `import "server-only"`: ese paquete asume Node, y acá estamos en Edge.
 * La protección igual existe, porque nadie importa este archivo desde el
 * navegador.
 */

export type CookieAGuardar = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export function createSupabaseProxyClient(request: NextRequest) {
  const pendientes: CookieAGuardar[] = [];

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const cookie of cookiesToSet) {
          // También en el request: si más adelante en este mismo proxy algo
          // vuelve a leer la cookie, tiene que ver el valor nuevo y no el viejo.
          request.cookies.set(cookie.name, cookie.value);
          pendientes.push(cookie as CookieAGuardar);
        }
      },
    },
  });

  return { supabase, pendientes };
}
