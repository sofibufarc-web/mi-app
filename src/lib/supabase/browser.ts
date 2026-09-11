"use client";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client-config";

/**
 * Cliente de Supabase para el navegador, solo para la pantalla de restablecer
 * contraseña.
 *
 * El resto de la app NO usa Supabase desde el navegador: la sesión la maneja el
 * servidor con cookies y los datos salen de Postgres. Este es el único caso que
 * no puede hacerse en el servidor, porque el token de recuperación viene en el
 * fragmento de la URL —la parte después del `#`— y eso no llega al servidor.
 *
 * Las tres opciones importan:
 *
 * - `detectSessionInUrl`: que lea ese fragmento al cargar y arme la sesión sola.
 * - `flowType: "implicit"`: tiene que coincidir con el que usó quien mandó el
 *   mail (`src/lib/supabase/admin.ts`). El otro modo, PKCE, guarda un secreto en
 *   el navegador que inició el pedido; acá lo inició el servidor, así que ese
 *   secreto no existe de este lado y el link no se podría canjear.
 * - `persistSession: false`: la sesión vive solo mientras dura esta página. Sirve
 *   para el único paso que falta —guardar la contraseña nueva— y no deja nada
 *   guardado en el navegador.
 */
export function createSupabaseBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
