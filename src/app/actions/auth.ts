"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { canManageStore } from "@/lib/auth";
import {
  clearLoginFailures,
  countLoginFailures,
  getUserById,
  recordLoginFailure,
} from "@/lib/data-source";
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

/** Intentos fallidos permitidos por IP dentro de la ventana, antes de frenar. */
const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 15;

/**
 * La IP del visitante, para contar sus intentos fallidos.
 *
 * Vercel pone la IP real en `x-forwarded-for` (si vienen varias separadas por
 * coma, la primera es la del cliente). En local no existe y cae a "local".
 */
async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * El camino común a los dos logins: freno de intentos, Supabase, perfil activo
 * y redirect. Solo cambia de dónde sale el email.
 */
async function iniciarSesion(
  email: string,
  password: string,
  next: string,
  esAdmin: boolean,
): Promise<LoginState> {
  const t = await getT();
  const mensajeError = esAdmin ? t.login.adminError : t.login.error;

  if (!supabaseAuthIsConfigured()) {
    return { error: t.login.notConfigured, email };
  }

  /*
   * Freno de fuerza bruta. Con una contraseña compartida, adivinarla es el
   * ataque obvio. Pasados MAX_INTENTOS fallos en la ventana, ni siquiera se le
   * pregunta a Supabase: así el intento 6 no puede acertar por suerte.
   */
  const ip = await ipDelVisitante();
  if ((await countLoginFailures(ip, VENTANA_MINUTOS)) >= MAX_INTENTOS) {
    return { error: t.login.tooManyAttempts, email };
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
    await recordLoginFailure(ip);
    return { error: mensajeError, email };
  }

  // La cuenta es válida para Supabase, pero para esta app además tiene que tener
  // un perfil activo. Si no lo tiene, se deshace la sesión que se acaba de
  // crear: dejarla abierta sería dar acceso a alguien dado de baja.
  const perfil = await getUserById(data.user.id);
  if (!perfil || !perfil.active) {
    await supabase.auth.signOut();
    await recordLoginFailure(ip);
    return { error: mensajeError, email };
  }

  await clearLoginFailures(ip);

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

/**
 * Login de CLIENTES: solo contraseña.
 *
 * El email de la cuenta compartida sale de `CLIENT_LOGIN_EMAIL` (variable de
 * entorno del servidor) y el visitante nunca lo ve. Para Supabase sigue siendo
 * un login normal de email + contraseña; lo único que cambia es quién pone el
 * email.
 */
export async function loginClienteAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const email = process.env.CLIENT_LOGIN_EMAIL?.trim() ?? "";

  if (!email) {
    const t = await getT();
    return { error: t.login.clientNotConfigured, email: "" };
  }

  // El email compartido no vuelve al formulario: devolvemos "" para no filtrarlo.
  const resultado = await iniciarSesion(email, password, next, false);
  return { ...resultado, email: "" };
}

/** Login de ADMIN: email + contraseña, desde `/login/admin`. */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  return iniciarSesion(email, password, next, true);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  // Borra las cookies de sesión y, además, invalida el token del lado de
  // Supabase: no alcanza con olvidarlo de este lado.
  await supabase.auth.signOut();
  redirect("/");
}
