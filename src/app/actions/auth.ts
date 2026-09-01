"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { credentialsAreValid, expectedSessionToken } from "@/lib/auth";

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
  const next = String(formData.get("next") ?? "/admin");

  if (!credentialsAreValid(user, password)) {
    // Mensaje genérico a propósito: no decimos si falló el usuario o la clave.
    return { error: "Usuario o contraseña incorrectos." };
  }

  // `credentialsAreValid` ya garantiza que las variables están configuradas,
  // así que acá el token nunca es null. TypeScript no puede deducirlo solo, y
  // este chequeo además nos cubre si alguien reordena el código más adelante.
  const token = await expectedSessionToken();
  if (token === null) {
    return { error: "El panel no está configurado. Falta definir ADMIN_USER, ADMIN_PASSWORD y SESSION_SECRET." };
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

  // Solo permitimos redirigir a rutas internas: si alguien manipula ?next=
  // con una URL externa, lo ignoramos (open redirect).
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  redirect(target);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(siteConfig.auth.cookieName);
  redirect("/login");
}
