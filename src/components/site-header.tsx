import Link from "next/link";

import { CartBadge } from "@/components/cart-badge";
import { getCategories, getStoreConfig } from "@/lib/data-source";

/**
 * Header del catálogo público.
 *
 * Es un Server Component `async`: puede pedirle datos a la capa de datos
 * directamente, sin `useEffect` ni endpoints intermedios. Solo el carrito
 * (`CartBadge`) es cliente, porque depende de localStorage.
 *
 * El buscador es un <form> normal con method GET: navega a /buscar?q=…
 * y funciona incluso sin JavaScript.
 */
export async function SiteHeader() {
  const [config, categories] = await Promise.all([getStoreConfig(), getCategories()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      {/* Franja de contacto, solo desktop */}
      <div className="hidden bg-brand-darker text-white lg:block">
        <div className="container-wiedmer flex h-9 items-center justify-between text-xs">
          <p>{config.contact.address}</p>
          <p className="flex gap-4">
            <span>Tel. {config.contact.phone}</span>
            <span>{config.contact.hours}</span>
          </p>
        </div>
      </div>

      <div className="container-wiedmer flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0">
          <span className="text-xl font-bold tracking-[0.18em] text-brand sm:text-2xl">
            {config.logoText}
          </span>
        </Link>

        <form action="/buscar" className="hidden flex-1 md:block">
          <div className="relative">
            <input
              type="search"
              name="q"
              placeholder="Buscar por nombre o código…"
              aria-label="Buscar productos"
              className="h-10 w-full rounded-md border border-line bg-surface pl-4 pr-24 text-sm outline-none transition focus:border-brand focus:bg-white"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 rounded bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface sm:block"
          >
            Panel
          </Link>
          <CartBadge />
        </div>
      </div>

      {/* Buscador en mobile, debajo del logo */}
      <form action="/buscar" className="container-wiedmer pb-3 md:hidden">
        <input
          type="search"
          name="q"
          placeholder="Buscar por nombre o código…"
          aria-label="Buscar productos"
          className="h-10 w-full rounded-md border border-line bg-surface px-4 text-sm outline-none focus:border-brand focus:bg-white"
        />
      </form>

      {/* Barra de categorías. En mobile scrollea horizontalmente en vez de
          esconderse detrás de un menú hamburguesa: menos clics para el que
          viene a reponer mercadería. */}
      <nav className="bg-brand text-white">
        <div className="container-wiedmer flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            className="shrink-0 px-3 py-2.5 text-sm font-medium transition hover:bg-brand-dark"
          >
            Inicio
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-brand-dark"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
