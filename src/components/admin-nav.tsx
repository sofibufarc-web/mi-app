"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación lateral del panel. Es cliente solo para poder resaltar el link
 * activo con `usePathname()`, que es un hook y por lo tanto necesita navegador.
 */
const LINKS: Array<{ href: string; label: string; exact?: boolean; badge?: boolean }> = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/pedidos", label: "Pedidos", badge: true },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/fichas", label: "Fichas técnicas" },
  { href: "/admin/pendientes", label: "Pendientes de asignar" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/precios", label: "Lista de precios" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

/**
 * `pedidosNuevos` es el globito del link "Pedidos": cuántos hay sin atender. Lo
 * calcula el layout (que corre en el servidor y puede consultar la base).
 */
export function AdminNav({ pedidosNuevos = 0 }: { pedidosNuevos?: number }) {
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
            {link.badge && pedidosNuevos > 0 && (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  active ? "bg-on-brand text-brand" : "bg-accent text-white"
                }`}
              >
                {pedidosNuevos}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
