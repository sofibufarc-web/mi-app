"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación lateral del panel. Es cliente solo para poder resaltar el link
 * activo con `usePathname()`, que es un hook y por lo tanto necesita navegador.
 */
const LINKS = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/precios", label: "Lista de precios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              active
                ? "bg-brand text-on-brand"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
