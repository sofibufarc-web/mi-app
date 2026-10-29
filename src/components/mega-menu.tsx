"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  count: number;
  brands: string[];
  /** Subcategorías (Doble A → Lijas, Cintas, Varios). Si hay, el panel las muestra en vez de las marcas. */
  subcategories?: { name: string; slug: string; count: number }[];
};

/**
 * Barra de categorías con mega-menú.
 *
 * Al pasar el mouse (o enfocar con el teclado) por una categoría, baja un panel
 * con sus marcas —que filtran la categoría— y una foto destacada. El subrayado
 * se desliza entre ítems: es UN elemento que cambia de posición, no uno por
 * ítem, por eso la transición se ve continua.
 *
 * El panel entra con un fundido de 200 ms. Se cierra con un pequeño retardo al
 * salir el mouse, para que cruzar el hueco entre el ítem y el panel no lo cierre.
 */
export function MegaMenu({
  categories,
  homeLabel,
  allLabel,
  productsLabel,
  ariaLabel,
}: {
  categories: MenuCategory[];
  homeLabel: string;
  allLabel: string;
  productsLabel: string;
  ariaLabel: string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [subrayado, setSubrayado] = useState<{ x: number; w: number } | null>(null);
  const barra = useRef<HTMLUListElement>(null);
  const cierre = useRef<number | null>(null);

  const abrir = useCallback((id: string) => {
    if (cierre.current) window.clearTimeout(cierre.current);
    setAbierta(id);
  }, []);
  const cerrarConDemora = useCallback(() => {
    if (cierre.current) window.clearTimeout(cierre.current);
    cierre.current = window.setTimeout(() => setAbierta(null), 140);
  }, []);

  useLayoutEffect(() => {
    if (!abierta) return;
    const el = barra.current?.querySelector<HTMLElement>(`[data-cat="${abierta}"]`);
    if (el) {
      setSubrayado({ x: el.offsetLeft, w: el.offsetWidth });
    }
  }, [abierta]);

  const activa = categories.find((c) => c.id === abierta);

  return (
    <nav
      aria-label={ariaLabel}
      className="relative hidden border-t border-line md:block"
      onMouseLeave={cerrarConDemora}
      onKeyDown={(e) => e.key === "Escape" && setAbierta(null)}
    >
      <div className="container-wiedmer">
        <ul ref={barra} className="relative flex gap-1">
          <li>
            <Link
              href="/"
              onMouseEnter={() => setAbierta(null)}
              className="block px-3 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
            >
              {homeLabel}
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id} data-cat={c.id}>
              <Link
                href={`/categoria/${c.slug}`}
                onMouseEnter={() => abrir(c.id)}
                onFocus={() => abrir(c.id)}
                aria-expanded={abierta === c.id}
                className={`block whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors ${
                  abierta === c.id ? "text-brand" : "text-ink hover:text-brand"
                }`}
              >
                {c.name}
              </Link>
            </li>
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-brand transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: subrayado?.w ?? 0,
              transform: `translateX(${subrayado?.x ?? 0}px)`,
              opacity: abierta ? 1 : 0,
            }}
          />
        </ul>
      </div>

      {activa && (
        <div
          onMouseEnter={() => abrir(activa.id)}
          className="animate-fade-in absolute inset-x-0 top-full z-50 border-b border-line bg-card shadow-xl shadow-black/10 [animation-duration:200ms]"
        >
          <div className="container-wiedmer grid grid-cols-[1fr_18rem] gap-8 py-6">
            <div>
              <p className="font-display text-lg font-bold">{activa.name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {activa.count} {productsLabel}
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
                {activa.subcategories?.map((h) => (
                  <li key={h.slug}>
                    <Link
                      href={`/categoria/${h.slug}`}
                      onClick={() => setAbierta(null)}
                      className="inline-block py-1 text-sm font-semibold text-ink transition hover:translate-x-1 hover:text-brand"
                    >
                      {h.name} <span className="font-normal text-ink-soft">({h.count})</span>
                    </Link>
                  </li>
                ))}
                {!activa.subcategories?.length && activa.brands.map((b) => (
                  <li key={b}>
                    <Link
                      href={`/categoria/${activa.slug}?brand=${encodeURIComponent(b)}`}
                      onClick={() => setAbierta(null)}
                      className="inline-block py-1 text-sm text-ink-soft transition hover:translate-x-1 hover:text-brand"
                    >
                      {b}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/categoria/${activa.slug}`}
                onClick={() => setAbierta(null)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
              >
                {allLabel} →
              </Link>
            </div>
            <Link
              href={`/categoria/${activa.slug}`}
              onClick={() => setAbierta(null)}
              className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-surface"
            >
              {activa.image && (
                <Image
                  src={activa.image}
                  alt=""
                  fill
                  sizes="288px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
