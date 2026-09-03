"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { anyAuthIsConfigured, siteConfig } from "@/config/site";
import { canManageStore, roleForCredentials, sessionTokenFor } from "@/lib/auth";
import { getT } from "@/lib/request-context";

/**
 * Server Actions de sesión.
 *
 * `"use server"` arriba de todo marca este archivo como código que SIEMPRE
 * corre en el servidor. Next expone estas funciones al formulario del cliente
 * como si fueran locales, pero por debajo hace un POST. Ventaja frente a
 * armarse un endpoint a mano: no hay que escribir el fetch ni parsear el body,
 * y el formulario funciona aunque el JavaScript no haya cargado todavía.
 */

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const t = await getT();

  if (!anyAuthIsConfigured()) {
    return { error: t.login.notConfigured };
  }

  const role = roleForCredentials(user, password);
  if (role === null) {
    // Mensaje genérico a propósito: no decimos si falló el usuario o la clave,
    // así nadie puede ir descubriendo usuarios válidos a fuerza de probar.
    return { error: t.login.error };
  }

  // `roleForCredentials` ya garantiza que las variables de ese rol están
  // configuradas, así que acá el token nunca es null. TypeScript no puede
  // deducirlo solo, y el chequeo nos cubre si alguien reordena el código.
  const token = await sessionTokenFor(role);
  if (token === null) {
    return { error: t.login.notConfigured };
  }

  const cookieStore = await cookies();
  cookieStore.set(siteConfig.auth.cookieName, token, {
    // httpOnly: el JavaScript de la página no puede leerla. Protege contra XSS.
    httpOnly: true,
    // sameSite lax: no viaja en requests que vienen de otro sitio (protege CSRF).
    sameSite: "lax",
    // secure solo en producción; en localhost no hay HTTPS.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: siteConfig.auth.maxAge,
  });

  // A dónde va después de entrar:
  // - si venía de una página protegida, vuelve ahí;
  // - si no, el admin va al panel y el cliente al catálogo, que es lo que
  //   quiere ver ahora que tiene los precios destrabados.
  const fallback = canManageStore(role) ? "/admin" : "/";

  // Solo permitimos redirigir a rutas internas: si alguien manipula ?next=
  // con una URL externa, lo ignoramos (open redirect).
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : fallback;

  redirect(target);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(siteConfig.auth.cookieName);
  redirect("/");
}
