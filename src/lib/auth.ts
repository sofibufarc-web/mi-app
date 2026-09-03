import {
  adminAuthIsConfigured,
  clientAuthIsConfigured,
  siteConfig,
  type Role,
} from "@/config/site";

/**
 * Sesión: dos niveles con un solo mecanismo.
 *
 * La idea es simple: no guardamos la contraseña en la cookie. Guardamos un
 * "token" que es el hash SHA-256 de `rol:usuario:contraseña:secreto`. En cada
 * request comparamos la cookie contra los tokens posibles y así sabemos con
 * qué rol entró. Si alguien roba la cookie no puede deducir la contraseña (un
 * hash no se puede revertir).
 *
 * El `rol:` adelante importa: sin él, si el cliente y el admin tuvieran por
 * casualidad las mismas credenciales, los dos tokens serían idénticos.
 *
 * Usamos `crypto.subtle` (Web Crypto), que es la API estándar de criptografía
 * del navegador y también existe en Node y en el runtime Edge. Esto importa
 * porque el proxy corre en Edge, donde `node:crypto` NO está disponible.
 *
 * Todo acá es async porque `crypto.subtle.digest` devuelve una promesa.
 *
 * ⚠️ Es una sesión simple, suficiente para un login genérico compartido. No
 * reemplaza a un sistema de usuarios real (ver "Pendientes" en CLAUDE.md).
 */

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * El token que corresponde a un rol.
 *
 * Devuelve `null` si a ese rol le falta alguna variable de entorno. Devolver
 * null en vez de un hash de cadenas vacías es importante: si no, el token de
 * "sin configurar" sería un valor fijo y conocido, y cualquiera podría ponerlo
 * en su cookie y entrar.
 */
export async function sessionTokenFor(role: Role): Promise<string | null> {
  const { sessionSecret } = siteConfig.auth;

  if (role === "admin") {
    if (!adminAuthIsConfigured()) return null;
    const { user, password } = siteConfig.auth.admin;
    return sha256Hex(`admin:${user}:${password}:${sessionSecret}`);
  }

  if (!clientAuthIsConfigured()) return null;
  const { user, password } = siteConfig.auth.client;
  return sha256Hex(`cliente:${user}:${password}:${sessionSecret}`);
}

/**
 * ¿Con qué rol entran estas credenciales? `null` si no son válidas.
 *
 * Se prueba admin primero: si alguien configuró las mismas credenciales para
 * los dos, que entre con el rol más alto.
 */
export function roleForCredentials(user: string, password: string): Role | null {
  const cleanUser = user.trim();

  if (
    adminAuthIsConfigured() &&
    cleanUser === siteConfig.auth.admin.user &&
    password === siteConfig.auth.admin.password
  ) {
    return "admin";
  }

  if (
    clientAuthIsConfigured() &&
    cleanUser === siteConfig.auth.client.user &&
    password === siteConfig.auth.client.password
  ) {
    return "cliente";
  }

  return null;
}

/**
 * ¿A qué rol corresponde el valor de la cookie? `null` si no es válido o si no
 * hay cookie.
 *
 * Es la función que usa todo el resto de la app para preguntar "¿quién es
 * este?". El proxy la usa para cortar el paso a `/admin`; las páginas, para
 * decidir si muestran los precios.
 */
export async function roleForSessionToken(
  token: string | undefined,
): Promise<Role | null> {
  if (!token) return null;

  const adminToken = await sessionTokenFor("admin");
  if (adminToken !== null && token === adminToken) return "admin";

  const clientToken = await sessionTokenFor("cliente");
  if (clientToken !== null && token === clientToken) return "cliente";

  return null;
}

/**
 * ¿Este rol puede ver precios y armar pedidos?
 *
 * Hoy la respuesta es "cualquiera que haya iniciado sesión", pero está en una
 * función propia para que el día que existan listas mayorista/minorista se
 * cambie en un solo lugar.
 */
export function canSeePrices(role: Role | null): boolean {
  return role !== null;
}

/** ¿Este rol puede entrar al panel? */
export function canManageStore(role: Role | null): boolean {
  return role === "admin";
}
