"use client";

import { useCallback, useSyncExternalStore } from "react";

import { setPreferenceCookie } from "@/lib/browser-cookies";
import type { Dictionary } from "@/lib/i18n";

/**
 * Botón de modo día / modo noche.
 *
 * Cómo funciona el tema, de punta a punta:
 *
 * 1. El servidor lee la cookie `wiedmer_theme` y pone `data-theme="dark"` (o
 *    "light") en el `<html>` (ver `src/app/layout.tsx`). Como el atributo ya
 *    viene en el HTML, la página se pinta directamente con el tema correcto:
 *    no hay parpadeo blanco al cargar.
 * 2. Si no hay cookie, no hay atributo, y el CSS usa la preferencia del
 *    sistema operativo (`prefers-color-scheme`). Son TRES estados, no dos.
 * 3. Este botón cambia el atributo en el acto —por eso el cambio se ve
 *    instantáneo, sin ir al servidor— y además escribe la cookie para que la
 *    próxima carga ya arranque bien.
 *
 * La cookie se escribe con `document.cookie` y no con una Server Action porque
 * no es información sensible y no queremos esperar un viaje al servidor para
 * algo puramente visual.
 */

const COOKIE_NAME = "wiedmer_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

type Theme = "light" | "dark";

/**
 * El tema que se está viendo AHORA, leído del DOM.
 *
 * La fuente de verdad es el navegador, no un `useState`: el atributo del
 * `<html>` lo puede haber puesto el servidor, y la preferencia del sistema
 * puede cambiar mientras la página está abierta.
 */
function readTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Avisa cuando el tema cambia, por cualquiera de los dos motivos posibles:
 * que alguien toque el atributo del `<html>`, o que el usuario cambie el modo
 * oscuro de su sistema operativo con la página abierta.
 */
function subscribeToTheme(onChange: () => void): () => void {
  // MutationObserver mira cambios en el DOM. Acá, solo el atributo data-theme
  // del <html>.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

export function ThemeToggle({
  t,
  /**
   * El tema que el servidor leyó de la cookie, o `null` si el usuario nunca
   * eligió y manda el sistema operativo.
   */
  initial,
}: {
  t: Dictionary["theme"];
  initial: Theme | null;
}) {
  /*
   * El tercer argumento de `useSyncExternalStore` es el valor que se usa al
   * renderizar en el servidor y al hidratar. En el servidor no existen ni el
   * DOM ni el sistema operativo del visitante, así que lo mejor que sabemos es
   * la cookie. Si hay cookie, el icono que pinta el servidor ya es el correcto
   * y no hay ningún salto al hidratar; si no la hay, arrancamos en claro y
   * React corrige el icono apenas puede mirar el navegador.
   *
   * `useCallback` mantiene la MISMA función entre renders. Importa: si le
   * pasáramos una flecha nueva cada vez, React la trataría como un store
   * distinto y volvería a suscribirse sin necesidad.
   */
  const getServerTheme = useCallback((): Theme => initial ?? "light", [initial]);

  const theme = useSyncExternalStore(subscribeToTheme, readTheme, getServerTheme);
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    // Al cambiar el atributo se dispara el MutationObserver de arriba, que
    // vuelve a leer el tema y re-renderiza el botón. No hace falta setState.
    document.documentElement.dataset.theme = next;
    setPreferenceCookie(COOKIE_NAME, next, ONE_YEAR);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.toggleAria}
      // aria-pressed le cuenta a un lector de pantalla si el modo noche está
      // activado o no, cosa que el icono solo no comunica.
      aria-pressed={isDark}
      title={isDark ? t.light : t.dark}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-surface hover:text-ink"
    >
      {/* Los dos iconos están siempre en el DOM y se cruzan con una rotación:
          queda más prolijo que hacerlos aparecer y desaparecer de golpe. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </svg>

      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
        }`}
      >
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
