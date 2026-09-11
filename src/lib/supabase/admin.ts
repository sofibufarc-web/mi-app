import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./client-config";

/**
 * Altas y bajas de cuentas, para el panel.
 *
 * ## Por qué un cliente "suelto" y no el de `server.ts`
 *
 * El cliente de `server.ts` está atado a las cookies del visitante. Si lo
 * usáramos para dar de alta a otra persona, `signUp` guardaría la sesión de esa
 * persona en las cookies del admin: el admin terminaría logueado como el usuario
 * que acaba de crear. Este cliente no toca cookies, así que la sesión que
 * devuelve el alta se descarta y nadie se entera.
 *
 * ## Por qué `signUp` y no la API de administración
 *
 * Supabase tiene una API de administración (`auth.admin.createUser`) que es el
 * camino natural para esto. Pide la **clave secreta** del proyecto, que este
 * proyecto no usa en ningún lado. `signUp` hace lo mismo con la clave pública.
 *
 * La diferencia práctica: `signUp` deja la cuenta **sin confirmar**, porque el
 * proyecto tiene activada la confirmación por email. Como el alta la hace un
 * admin —no es alguien registrándose solo— la confirmamos nosotros por SQL, que
 * es una actualización de una fecha. Ver `confirmUserEmail()` en
 * `src/lib/data-source.ts`.
 */

/** Cliente sin sesión ni cookies. Solo para operar sobre OTRAS cuentas. */
function clienteSuelto() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Crea la cuenta en Supabase Auth y devuelve su id.
 *
 * Ojo con los duplicados: cuando la confirmación por email está activada,
 * Supabase responde "todo bien" aunque el email ya exista. Es a propósito, para
 * que nadie pueda averiguar qué emails están registrados probando altas. Por eso
 * quien llama tiene que chequear antes contra `profiles`, que sí podemos leer.
 */
export async function createAuthUser(
  email: string,
  password: string,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await clienteSuelto().auth.signUp({ email, password });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Supabase no devolvió la cuenta creada." };

  return { id: data.user.id };
}

/**
 * Manda el mail de "restablecer contraseña".
 *
 * El panel no puede cambiarle la contraseña a otro: para eso haría falta la
 * clave secreta. Y está bien que no pueda: la contraseña de una persona no
 * debería pasar nunca por las manos de otra. El mail lleva un link de un solo
 * uso que la lleva a elegirla ella misma.
 *
 * ⚠️ El servidor de correo que trae Supabase por defecto es muy limitado (unos
 * pocos mails por hora, y solo a integrantes del proyecto). Para usarlo de
 * verdad hay que configurar un SMTP propio en el panel de Supabase.
 */
export async function sendPasswordReset(
  email: string,
  redirectTo: string,
): Promise<{ error: string | null }> {
  const { error } = await clienteSuelto().auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error: error?.message ?? null };
}
