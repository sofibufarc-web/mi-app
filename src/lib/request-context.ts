import "server-only";

import { cookies, headers } from "next/headers";

import { siteConfig, type Role } from "@/config/site";
import { canSeePrices, roleForSessionToken } from "@/lib/auth";
import { getDictionary, isLocale, type Dictionary, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE, LOCALE_HEADER, resolveLocale } from "@/lib/locale";

/**
 * "¿Quién está mirando la página, y en qué idioma?"
 *
 * Todo lo que un Server Component necesita saber del visitante en un solo
 * lugar. Se importa desde páginas y layouts, nunca desde el proxy: usa
 * `next/headers`, que no existe en el runtime Edge del proxy.
 *
 * `import "server-only"` de arriba es una red de seguridad: si por error
 * alguien importa este archivo desde un componente cliente, el build falla con
 * un mensaje claro en vez de filtrar código de servidor al navegador.
 *
 * No hace falta memorizar los resultados: Next ya deduplica `cookies()` y
 * `headers()` dentro de un mismo request.
 */

/** Idioma de este request. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  // El proxy ya resolvió el idioma y lo dejó en este header. Es lo que cubre
  // el primer request de un visitante nuevo, cuando la cookie todavía no
  // volvió del navegador.
  const fromProxy = headerList.get(LOCALE_HEADER);
  if (isLocale(fromProxy)) return fromProxy;

  // Respaldo por si la ruta no pasó por el proxy (por ejemplo, un archivo
  // estático excluido del matcher).
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    country: headerList.get("x-vercel-ip-country"),
    acceptLanguage: headerList.get("accept-language"),
  });
}

/** Los textos traducidos de este request. Se usa como `const t = await getT()`. */
export async function getT(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}

/** Rol del visitante: "admin", "cliente" o `null` si no inició sesión. */
export async function getRole(): Promise<Role | null> {
  const cookieStore = await cookies();
  return roleForSessionToken(cookieStore.get(siteConfig.auth.cookieName)?.value);
}

/**
 * Todo junto, que es como lo piden casi todas las páginas.
 *
 * `showPrices` es la decisión ya tomada: los componentes no tienen que volver
 * a razonar sobre roles, solo reciben un booleano.
 */
export async function getViewer(): Promise<{
  role: Role | null;
  showPrices: boolean;
  locale: Locale;
  t: Dictionary;
}> {
  const [role, locale] = await Promise.all([getRole(), getLocale()]);
  return {
    role,
    showPrices: canSeePrices(role),
    locale,
    t: getDictionary(locale),
  };
}

/**
 * Tema elegido explícitamente, o `null` si el usuario nunca tocó el botón.
 *
 * `null` significa "el que diga el sistema operativo", y eso lo resuelve el
 * CSS con `@media (prefers-color-scheme: dark)`. Leerlo en el servidor evita
 * el parpadeo blanco al cargar que tienen los sitios que aplican el tema
 * recién desde el JavaScript.
 */
export async function getTheme(): Promise<"light" | "dark" | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(siteConfig.themeCookie)?.value;
  return value === "light" || value === "dark" ? value : null;
}
