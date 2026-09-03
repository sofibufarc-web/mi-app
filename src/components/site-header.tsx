import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { CartBadge } from "@/components/cart-badge";
import { HeaderShell } from "@/components/header-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { canManageStore, canSeePrices } from "@/lib/auth";
import { getCategories, getStoreConfig } from "@/lib/data-source";
import { getTheme, getViewer } from "@/lib/request-context";

/**
 * Header del catálogo público.
 *
 * Es un Server Component `async`: puede pedirle datos a la capa de datos
 * directamente, sin `useEffect` ni endpoints intermedios. Solo son cliente las
 * piezas que de verdad lo necesitan: el carrito (lee localStorage), el
 * selector de idioma, el botón de tema y la cáscara que detecta el scroll.
 *
 * El buscador es un <form> normal con method GET: navega a /buscar?q=…
 * y funciona incluso sin JavaScript.
 */
export async function SiteHeader() {
  const [config, categories, viewer, theme] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getViewer(),
    getTheme(),
  ]);
  const { t, locale, role } = viewer;

  return (
    <HeaderShell>
      {/*
        Franja de contacto, solo desktop.
        Al scrollear se pliega: `grid-rows-[0fr]` colapsa la fila a altura cero
        y la transición la anima. Es el truco estándar para animar "hasta el
        alto que tenga el contenido", que con `height: auto` no se puede.
      */}
      <div className="hidden bg-brand-darker text-white lg:block">
        <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 group-data-[scrolled=true]:grid-rows-[0fr]">
          <div className="overflow-hidden">
            <div className="container-wiedmer flex h-9 items-center justify-between text-xs">
              <p>{config.contact.address}</p>
              <p className="flex gap-4">
                <span>Tel. {config.contact.phone}</span>
                <span>{config.contact.hours}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wiedmer flex h-16 items-center gap-4 transition-[height] duration-300 group-data-[scrolled=true]:h-14">
        <Link
          href="/"
          aria-label={config.storeName}
          className="shrink-0 text-brand transition-opacity hover:opacity-80"
        >
          <WiedmerLogo size="md" />
        </Link>

        <form action="/buscar" className="hidden flex-1 md:block">
          <div className="relative">
            <input
              type="search"
              name="q"
              placeholder={t.common.searchPlaceholder}
              aria-label={t.common.searchAria}
              className="h-10 w-full rounded-md border border-line bg-surface pl-4 pr-24 text-sm outline-none transition focus:border-brand focus:bg-card"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 h-8 rounded bg-brand px-4 text-xs font-semibold text-on-brand transition hover:bg-brand-dark"
            >
              {t.common.search}
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <div className="hidden sm:block">
            <LanguageSwitcher current={locale} t={t.language} />
          </div>

          <ThemeToggle t={t.theme} initial={theme} />

          {canManageStore(role) && (
            <Link
              href="/admin"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink lg:block"
            >
              {t.common.panel}
            </Link>
          )}

          {role === null ? (
            <Link
              href="/login"
              className="hidden rounded-md border border-line px-3 py-2 text-sm font-semibold transition hover:border-brand hover:text-brand sm:block"
            >
              {t.common.login}
            </Link>
          ) : (
            /* Una Server Action se puede pasar directo como `action` de un
               <form>, sin componente cliente ni fetch de por medio. */
            <form action={logoutAction} className="hidden sm:block">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
              >
                {t.common.logout}
              </button>
            </form>
          )}

          {/* Sin precios no hay pedido posible, así que el carrito ni aparece. */}
          {canSeePrices(role) && <CartBadge t={t.common} />}
        </div>
      </div>

      {/* Buscador en mobile, debajo del logo */}
      <form action="/buscar" className="container-wiedmer pb-3 md:hidden">
        <input
          type="search"
          name="q"
          placeholder={t.common.searchPlaceholder}
          aria-label={t.common.searchAria}
          className="h-10 w-full rounded-md border border-line bg-surface px-4 text-sm outline-none focus:border-brand focus:bg-card"
        />
      </form>

      {/* Barra de categorías. En mobile scrollea horizontalmente en vez de
          esconderse detrás de un menú hamburguesa: menos clics para el que
          viene a reponer mercadería.

          En modo noche el azul saturado a lo ancho de la pantalla pesa
          demasiado, así que ahí la barra pasa a ser oscura con el texto claro.
          Es de los pocos lugares donde hace falta el prefijo `dark:`. */}
      <nav
        aria-label={t.common.categories}
        className="bg-brand text-on-brand dark:bg-card dark:text-ink"
      >
        <div className="container-wiedmer flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            className="shrink-0 px-3 py-2.5 text-sm font-medium transition hover:bg-black/15 dark:hover:bg-surface"
          >
            {t.common.home}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-black/15 dark:hover:bg-surface"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </HeaderShell>
  );
}
