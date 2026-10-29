"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/use-cart";
import type { MenuCategory } from "@/components/mega-menu";

/** Evento con el que el botón hamburguesa del header abre el menú. */
export const ABRIR_MENU = "wiedmer:abrir-menu";

/** Botón hamburguesa. Va en el header; el menú en sí vive en <MobileNav />. */
export function MenuButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => window.dispatchEvent(new Event(ABRIR_MENU))}
      className="flex h-11 w-11 items-center justify-center rounded-md text-ink transition hover:bg-surface md:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

/**
 * Menú de celular: pantalla completa con las categorías en lista grande, y la
 * barra inferior fija (Inicio · Categorías · Buscar · Pedido · WhatsApp).
 *
 * Vive en el layout y NO adentro del header: el header tiene `backdrop-filter`,
 * y un elemento con ese filtro se vuelve el «marco» de sus hijos `fixed`, que
 * dejarían de pegarse a la pantalla.
 */
export function MobileNav({
  categories,
  labels,
  whatsappUrl,
  canOrder,
}: {
  categories: MenuCategory[];
  labels: { home: string; categories: string; search: string; order: string; whatsapp: string; close: string };
  whatsappUrl: string;
  canOrder: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const { totalItems, ready } = useCart();

  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(ABRIR_MENU, abrir);
    return () => window.removeEventListener(ABRIR_MENU, abrir);
  }, []);

  // Al navegar se cierra; mientras está abierto, el fondo no scrollea.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierto(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors";
  const icono = { className: "h-5 w-5", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

  return (
    <>
      {abierto && (
        <div role="dialog" aria-modal="true" aria-label={labels.categories} className="animate-fade-in fixed inset-0 z-[60] overflow-y-auto bg-page md:hidden [animation-duration:200ms]">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-display text-lg font-bold text-brand">{labels.categories}</span>
            <button type="button" onClick={() => setAbierto(false)} aria-label={labels.close} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <ul className="px-4 pb-24">
            {categories.map((c, i) => (
              <li key={c.id} className="animate-fade-up border-b border-line" style={{ animationDelay: `${i * 40}ms`, animationDuration: "300ms" }}>
                <Link href={`/categoria/${c.slug}`} className="flex min-h-16 items-center justify-between py-3 font-display text-2xl font-bold tracking-tight">
                  {c.name}
                  <span className="text-sm font-medium text-ink-soft">{c.count}</span>
                </Link>
                {c.subcategories?.length ? (
                  <ul className="flex flex-wrap gap-2 pb-4">
                    {c.subcategories.map((h) => (
                      <li key={h.slug}>
                        <Link href={`/categoria/${h.slug}`} className="inline-block rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft">
                          {h.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[55] flex border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <Link href="/" className={`${item} ${pathname === "/" ? "text-brand" : "text-ink-soft"}`}>
          <svg viewBox="0 0 24 24" {...icono}><path d="M4 11l8-7 8 7v9H4v-9Z" /></svg>
          {labels.home}
        </Link>
        <button type="button" onClick={() => setAbierto(true)} className={`${item} text-ink-soft`}>
          <svg viewBox="0 0 24 24" {...icono}><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" /></svg>
          {labels.categories}
        </button>
        <Link href="/buscar" className={`${item} ${pathname === "/buscar" ? "text-brand" : "text-ink-soft"}`}>
          <svg viewBox="0 0 24 24" {...icono}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          {labels.search}
        </Link>
        <Link href={canOrder ? "/carrito" : "/login"} className={`${item} relative ${pathname === "/carrito" ? "text-brand" : "text-ink-soft"}`}>
          <svg viewBox="0 0 24 24" {...icono}><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8L20 7H6" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></svg>
          {labels.order}
          {canOrder && ready && totalItems > 0 && (
            <span className="absolute right-[calc(50%-1.5rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
              {totalItems}
            </span>
          )}
        </Link>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${item} text-[#128C7E]`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" /></svg>
          {labels.whatsapp}
        </a>
      </nav>
    </>
  );
}
