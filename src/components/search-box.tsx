"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Result = {
  name: string;
  href: string;
  image: string | null;
  category: string | null;
  code: string | null;
  variants: number;
};

/**
 * Buscador del header.
 *
 * - Se ensancha al recibir el foco.
 * - Muestra resultados mientras escribís (foto, código y categoría), con
 *   aparición escalonada. Nunca muestra precios: el endpoint no los devuelve.
 * - La tecla «/» lo enfoca desde cualquier parte, salvo que ya estés escribiendo
 *   en otro campo.
 * - Sin JavaScript sigue siendo un <form> GET a /buscar.
 */
export function SearchBox({
  placeholder,
  ariaLabel,
  buttonLabel,
}: {
  placeholder: string;
  ariaLabel: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cajaRef = useRef<HTMLFormElement>(null);
  const listaId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);

  // Atajo «/»
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  // Pedido con demora de 200 ms; si llega otro tecleo antes, se cancela el anterior.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const control = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(texto)}`, { signal: control.signal });
        const json = (await res.json()) as { results: Result[] };
        setResults(json.results);
        setActivo(-1);
      } catch {
        /* cancelado o sin red: no pasa nada */
      }
    }, 200);
    return () => {
      window.clearTimeout(espera);
      control.abort();
    };
  }, [q]);

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    function afuera(e: MouseEvent) {
      if (!cajaRef.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", afuera);
    return () => document.removeEventListener("mousedown", afuera);
  }, []);

  function alTeclearEnCampo(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setAbierto(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActivo((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActivo((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && activo >= 0 && results[activo]) {
      e.preventDefault();
      setAbierto(false);
      router.push(results[activo].href);
    }
  }

  const mostrar = abierto && q.trim().length >= 2 && results.length > 0;

  return (
    <form
      ref={cajaRef}
      action="/buscar"
      role="search"
      className="group relative mx-auto w-full max-w-md transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:max-w-2xl"
    >
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={q}
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclearEnCampo}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        className="h-11 w-full rounded-full border border-line bg-surface pl-4 pr-24 text-sm outline-none transition focus:border-brand focus:bg-card sm:h-10"
      />
      <kbd className="pointer-events-none absolute right-24 top-2.5 hidden rounded border border-line bg-card px-1.5 font-mono text-[11px] text-ink-soft group-focus-within:hidden sm:block">
        /
      </kbd>
      <button
        type="submit"
        className="btn-primary absolute right-1 top-1 h-9 rounded-full px-4 text-xs sm:h-8"
      >
        {buttonLabel}
      </button>

      {mostrar && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-card shadow-xl shadow-black/10"
        >
          {results.map((r, i) => (
            <li
              key={r.href}
              role="option"
              aria-selected={i === activo}
              className="animate-fade-up [animation-duration:250ms]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                href={r.href}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface ${
                  i === activo ? "bg-surface" : ""
                }`}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface">
                  {r.image && <Image src={r.image} alt="" fill sizes="44px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {r.code && <span className="font-mono">{r.code}</span>}
                    {r.code && r.category && " · "}
                    {r.category}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
