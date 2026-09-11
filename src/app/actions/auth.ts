"use server";

import { redirect } from "next/navigation";

import { canManageStore } from "@/lib/auth";
import { getUserById } from "@/lib/data-source";
import { getT } from "@/lib/request-context";
import { supabaseAuthIsConfigured } from "@/lib/supabase/client-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server Actions de sesión.
 *
 * `"use server"` arriba de todo marca este archivo como código que SIEMPRE
 * corre en el servidor. Next expone estas funciones al formulario del cliente
 * como si fueran locales, pero por debajo hace un POST. Ventaja frente a
 * armarse un endpoint a mano: no hay que escribir el fetch ni parsear el body,
 * y el formulario funciona aunque el JavaScript no haya cargado todavía.
 *
 * La contraseña la verifica **Supabase Auth**, no esta app. Acá no se hashea ni
 * se compara nada: se le pasa el email y la contraseña, y responde si son
 * válidas. Lo único nuestro es el rol, que sale de `profiles`.
 */

/**
 * Lo que la action le devuelve al formulario.
 *
 * Además del error viaja de vuelta el `email` que se tipeó. Sirve para que, si
 * la contraseña estaba mal, el campo no aparezca vacío: reescribirlo en cada
 * intento es la parte molesta de equivocarse. La contraseña NO vuelve, a
 * propósito: no hay motivo para que una clave dé una vuelta de más por la red.
 */
export type LoginState = { error: string | null; email: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const t = await getT();

  if (!supabaseAuthIsConfigured()) {
    return { error: t.login.notConfigured, email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  /*
   * Un solo mensaje para todos los motivos de rechazo: email que no existe,
   * contraseña equivocada, cuenta sin confirmar, cuenta desactivada.
   *
   * Es a propósito. Si dijéramos "ese email no está registrado", cualquiera
   * podría ir probando direcciones hasta armarse la lista de las que sí existen,
   * y recién entonces atacar las contraseñas.
   */
  if (error || !data.user) {
    return { error: t.login.error, email };
  }

  // La cuenta es válida para Supabase, pero para esta app además tiene que tener
  // un perfil activo. Si no lo tiene, se deshace la sesión que se acaba de
  // crear: dejarla abierta sería dar acceso a alguien dado de baja.
  const perfil = await getUserById(data.user.id);
  if (!perfil || !perfil.active) {
    await supabase.auth.signOut();
    return { error: t.login.error, email };
  }

  // A dónde va después de entrar:
  // - si venía de una página protegida, vuelve ahí;
  // - si no, el admin va al panel y el cliente al catálogo, que es lo que
  //   quiere ver ahora que tiene los precios destrabados.
  const porDefecto = canManageStore(perfil.role) ? "/admin" : "/";

  // Solo se permite redirigir a rutas internas: si alguien manipula ?next= con
  // una URL externa, se ignora (open redirect).
  const destino =
    next.startsWith("/") && !next.startsWith("//") ? next : porDefecto;

  // `redirect()` funciona lanzando una excepción que Next atrapa, así que tiene
  // que quedar afuera de cualquier try/catch.
  redirect(destino);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  // Borra las cookies de sesión y, además, invalida el token del lado de
  // Supabase: no alcanza con olvidarlo de este lado.
  await supabase.auth.signOut();
  redirect("/");
}
