"use client";

import Link from "next/link";

import { useCart } from "@/components/use-cart";
import type { Dictionary } from "@/lib/i18n";

/** Icono de carrito del header con el contador de ítems. */
export function CartBadge({ t }: { t: Dictionary["common"] }) {
  const { totalItems, ready } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-surface"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8L20 7H6" />
        <circle cx="9.5" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
      <span className="hidden sm:inline">{t.cart}</span>

      {/* `ready` evita que el número parpadee de 0 al valor real cuando se
          lee localStorage después del primer render.
          `key` fuerza a React a recrear el elemento cada vez que cambia el
          total: así se vuelve a disparar la animación de entrada y el número
          "salta" cuando agregás algo. */}
      {ready && totalItems > 0 && (
        <span
          key={totalItems}
          className="animate-fade-up absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand"
        >
          {totalItems}
        </span>
      )}
    </Link>
  );
}
