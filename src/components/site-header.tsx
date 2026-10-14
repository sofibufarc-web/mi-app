import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { CartBadge } from "@/components/cart-badge";
import { HeaderShell } from "@/components/header-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MegaMenu } from "@/components/mega-menu";
import { MenuButton } from "@/components/mobile-nav";
import { SearchBox } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { canManageStore, canSeePrices } from "@/lib/auth";
import { getCategories, getCategoryStats, getStoreConfig } from "@/lib/data-source";
import { getTheme, getViewer } from "@/lib/request-context";

/** Ícono de persona, para entrar / salir. */
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  );
}

/**
 * Header del catálogo público.
 *
 * Server Component `async`: pide los datos directamente a la capa de datos.
 * Solo son cliente las piezas que lo necesitan: el buscador en vivo, el
 * mega-menú, el carrito (lee localStorage), el selector de idioma, el botón de
 * tema y la cáscara que detecta el scroll.
 *
 * Fondo blanco; al bajar se achica y queda translúcido con desenfoque (ver
 * `HeaderShell`). En celular: hamburguesa + ícono de usuario siempre visible.
 */
export async function SiteHeader() {
  const [config, categories, stats, viewer, theme] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getCategoryStats(),
    getViewer(),
    getTheme(),
  ]);
  const { t, locale, role } = viewer;

  const menu = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    count: stats.get(c.id)?.count ?? 0,
    brands: stats.get(c.id)?.brands ?? [],
  }));

  return (
    <HeaderShell>
      {/* Franja de contacto, solo desktop. Al scrollear se pliega
          (`grid-rows-[1fr]` → `[0fr]` es el truco para animar hasta «lo que
          mida el contenido»). */}
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

      <div className="container-wiedmer flex h-16 items-center gap-2 transition-[height] duration-300 group-data-[scrolled=true]:h-14 sm:gap-4">
        <MenuButton label={t.nav.openMenu} />

        <Link
          href="/"
          aria-label={config.storeName}
          className="shrink-0 text-brand transition-opacity hover:opacity-80"
        >
          <WiedmerLogo size="md" />
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBox
            placeholder={t.common.searchPlaceholder}
            ariaLabel={t.common.searchAria}
            buttonLabel={t.common.search}
          />
        </div>

        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
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
              aria-label={t.common.login}
              className="flex min-h-11 items-center gap-2 rounded-md px-2.5 text-sm font-semibold transition hover:bg-surface hover:text-brand"
            >
              <UserIcon />
              <span className="hidden sm:inline">{t.common.login}</span>
            </Link>
          ) : (
            /* Una Server Action se puede pasar directo como `action` de un
               <form>, sin componente cliente ni fetch de por medio. */
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label={t.common.logout}
                className="flex min-h-11 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
              >
                <UserIcon />
                <span className="hidden sm:inline">{t.common.logout}</span>
              </button>
            </form>
          )}

          {/* Sin precios no hay pedido posible, así que el carrito ni aparece. */}
          {canSeePrices(role) && <CartBadge t={t.common} />}
        </div>
      </div>

      {/* Buscador en celular, debajo del logo */}
      <div className="container-wiedmer pb-3 md:hidden">
        <SearchBox
          placeholder={t.common.searchPlaceholder}
          ariaLabel={t.common.searchAria}
          buttonLabel={t.common.search}
        />
      </div>

      <MegaMenu
        categories={menu}
        homeLabel={t.common.home}
        allLabel={t.nav.seeAll}
        productsLabel={t.nav.products}
        ariaLabel={t.common.categories}
      />
    </HeaderShell>
  );
}
