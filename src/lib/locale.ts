import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/**
 * Detección de idioma.
 *
 * IMPORTANTE: este archivo lo importa `src/proxy.ts`, que corre en el runtime
 * Edge. Ahí no existen `fs` ni `next/headers`. Por eso son todas funciones
 * puras que reciben strings y devuelven un idioma; quien lee el request de
 * verdad es el proxy (ver `src/lib/request-context.ts` para el lado servidor).
 *
 * --- Sobre "que cambie según la VPN" ---
 * Un navegador no le cuenta a la web si hay una VPN de por medio: es
 * justamente lo que una VPN oculta. Lo que sí llega es la IP desde la que
 * entra el visitante, y de ahí el país. Como la VPN cambia esa IP, el efecto
 * termina siendo el que buscamos: si alguien se conecta desde un servidor de
 * Estados Unidos, el sitio lo ve como visitante de Estados Unidos y le habla
 * en inglés.
 *
 * El país lo resuelve Vercel y lo manda en el header `x-vercel-ip-country`
 * (dos letras, ej. "AR"). En local ese header no existe, así que caemos al
 * idioma que el navegador declara en `Accept-Language`.
 *
 * Y por encima de todo manda la elección explícita del usuario, guardada en
 * una cookie: si tocó el selector, respetamos eso y no volvemos a adivinar.
 */

/** Cookie donde guardamos el idioma elegido. */
export const LOCALE_COOKIE = "wiedmer_lang";

/**
 * Header interno con el que el proxy le pasa el idioma ya resuelto a las
 * páginas. Sirve para el PRIMER request de un visitante nuevo: en ese momento
 * la cookie todavía no llegó al navegador, así que sin esto la página se
 * renderizaría en el idioma por defecto y recién cambiaría al recargar.
 */
export const LOCALE_HEADER = "x-wiedmer-lang";

/** Cuánto dura la preferencia de idioma: un año. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Países donde el español es lengua oficial o mayoritaria (código ISO 3166-1
 * de dos letras). Un visitante desde cualquiera de estos ve el sitio en
 * español; el resto del mundo, en inglés.
 */
const SPANISH_SPEAKING_COUNTRIES = new Set([
  "AR", // Argentina
  "BO", // Bolivia
  "CL", // Chile
  "CO", // Colombia
  "CR", // Costa Rica
  "CU", // Cuba
  "DO", // República Dominicana
  "EC", // Ecuador
  "ES", // España
  "GQ", // Guinea Ecuatorial
  "GT", // Guatemala
  "HN", // Honduras
  "MX", // México
  "NI", // Nicaragua
  "PA", // Panamá
  "PE", // Perú
  "PR", // Puerto Rico
  "PY", // Paraguay
  "SV", // El Salvador
  "UY", // Uruguay
  "VE", // Venezuela
]);

/** País (dos letras) → idioma. `null` si no sabemos de dónde viene. */
export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  return SPANISH_SPEAKING_COUNTRIES.has(country.toUpperCase()) ? "es" : "en";
}

/**
 * Idioma preferido según el header `Accept-Language` del navegador.
 *
 * El header viene con formato `es-AR,es;q=0.9,en;q=0.8`: una lista de idiomas
 * con un "peso" q de 0 a 1 que indica cuánto los prefiere el usuario. Los
 * recorremos de mayor a menor peso y devolvemos el primero que sepamos hablar.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const preferences = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
      return {
        // "es-AR" → "es": nos alcanza con el idioma, no con la región.
        language: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { language } of preferences) {
    if (isLocale(language)) return language;
  }
  return null;
}

/**
 * El idioma definitivo para un request, en orden de prioridad:
 *   1. La cookie (el usuario tocó el selector) — manda siempre.
 *   2. El país de la IP (lo que cambia una VPN).
 *   3. El idioma del navegador.
 *   4. Español, que es el idioma de la casa.
 */
export function resolveLocale({
  cookie,
  country,
  acceptLanguage,
}: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(cookie)) return cookie;
  return (
    localeFromCountry(country) ??
    localeFromAcceptLanguage(acceptLanguage) ??
    DEFAULT_LOCALE
  );
}
