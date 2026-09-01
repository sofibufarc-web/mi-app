import { adminAuthIsConfigured, siteConfig } from "@/config/site";

/**
 * Sesión del panel.
 *
 * La idea es simple: no guardamos la contraseña en la cookie. Guardamos un
 * "token" que es el hash SHA-256 de `usuario:contraseña:secreto`. En cada
 * request comparamos la cookie con ese mismo hash recalculado. Si alguien roba
 * la cookie no puede deducir la contraseña (un hash no se puede revertir).
 *
 * Usamos `crypto.subtle` (Web Crypto), que es la API estándar de criptografía
 * del navegador y también existe en Node y en el runtime Edge. Esto importa
 * porque el middleware corre en Edge, donde `node:crypto` NO está disponible.
 *
 * Todo acá es async porque `crypto.subtle.digest` devuelve una promesa.
 *
 * ⚠️ Esto es una sesión simple, suficiente para un login genérico compartido.
 * No reemplaza a un sistema de usuarios real (ver "Pendientes" en CLAUDE.md).
 */

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * El token que corresponde a las credenciales configuradas.
 *
 * Devuelve `null` si falta alguna variable de entorno. Devolver null en vez de
 * un hash de cadenas vacías es importante: si no, el token de "sin configurar"
 * sería un valor fijo y conocido, y cualquiera podría ponerlo en su cookie.
 */
export async function expectedSessionToken(): Promise<string | null> {
  if (!adminAuthIsConfigured()) return null;
  const { user, password, sessionSecret } = siteConfig.auth;
  return sha256Hex(`${user}:${password}:${sessionSecret}`);
}

/** ¿Las credenciales que mandó el formulario son las correctas? */
export function credentialsAreValid(user: string, password: string): boolean {
  // Sin variables configuradas no hay login posible: si no chequeáramos esto,
  // mandar usuario y contraseña vacíos entraría al panel.
  if (!adminAuthIsConfigured()) return false;
  return (
    user.trim() === siteConfig.auth.user && password === siteConfig.auth.password
  );
}

/** ¿El valor de la cookie corresponde a una sesión válida? */
export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedSessionToken();
  if (expected === null) return false;
  return token === expected;
}
