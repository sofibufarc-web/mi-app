"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setPreferenceCookie } from "@/lib/browser-cookies";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/locale";
import { locales, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Selector de idioma ES / EN.
 *
 * El idioma se detecta solo (país de la IP en producción, idioma del navegador
 * en local — ver `src/lib/locale.ts`), pero la elección manual siempre gana:
 * en cuanto el usuario toca un botón, guardamos la cookie y ya no volvemos a
 * adivinar.
 *
 * Después de escribir la cookie hace falta `router.refresh()`. Es porque los
 * textos se arman en el SERVIDOR: cambiar la cookie sola no cambiaría nada en
 * pantalla, hay que pedirle al servidor que vuelva a renderizar. `refresh()`
 * hace eso sin recargar la página entera: mantiene el scroll, el carrito y lo
 * que estuviera escrito en los formularios.
 *
 * `useTransition` marca esa espera como "no urgente": React deja la interfaz
 * usable mientras llega la respuesta, y `isPending` nos deja atenuar el
 * control para que se note que algo está pasando.
 */
export function LanguageSwitcher({
  current,
  t,
}: {
  current: Locale;
  t: Dictionary["language"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;

    setPreferenceCookie(LOCALE_COOKIE, locale, LOCALE_COOKIE_MAX_AGE);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t.switchAria}
      className={`flex items-center rounded-md border border-line p-0.5 transition-opacity ${
        isPending ? "opacity-50" : ""
      }`}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            // aria-current le dice al lector de pantalla cuál está activo.
            aria-current={active ? "true" : undefined}
            className={`rounded px-2 py-1 text-xs font-bold uppercase transition ${
              active
                ? "bg-brand text-on-brand"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
