import { Suspense } from "react";

import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WelcomeToast } from "@/components/welcome-toast";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { canSeePrices } from "@/lib/auth";
import { getCategories, getCategoryStats, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

/**
 * Layout del catálogo público.
 *
 * `(tienda)` entre paréntesis es un "route group": agrupa páginas para
 * compartir este layout SIN aparecer en la URL. O sea, la página que está en
 * `app/(tienda)/carrito/page.tsx` se sirve en `/carrito`, no en `/tienda/carrito`.
 *
 * Sirve para que el panel (`/admin`) y el login tengan otro layout, sin header
 * ni footer de tienda.
 *
 * `dynamic = "force-dynamic"` le dice a Next que NO congele estas páginas en el
 * build. Nuestros datos viven en archivos JSON que el panel modifica en caliente,
 * y Next no tiene forma de enterarse de esos cambios: sin esto, el catálogo
 * quedaría mostrando siempre la foto del momento del build. Al aplicarlo en el
 * layout, vale para todas las páginas de la tienda.
 *
 * (Cuando migremos a Supabase se puede volver a cachear con `revalidate`.)
 */
export const dynamic = "force-dynamic";

export default async function TiendaLayout({ children }: LayoutProps<"/">) {
  const [viewer, config, categories, stats] = await Promise.all([
    getViewer(),
    getStoreConfig(),
    getCategories(),
    getCategoryStats(),
  ]);
  const { t, role } = viewer;

  return (
    <>
      {/*
        Enlace "saltar al contenido".

        Está escondido hasta que recibe el foco del teclado, y entonces aparece
        arriba de todo. Es para quien navega con Tab: sin esto tendría que pasar
        por el logo, el buscador, el selector de idioma y las diez categorías en
        CADA página antes de llegar a lo que vino a leer.
      */}
      <a
        href="#contenido"
        className="sr-only rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        {t.common.skipToContent}
      </a>

      <Suspense fallback={null}>
        <WelcomeToast message={t.login.welcome} />
      </Suspense>

      <SiteHeader />
      <main id="contenido" className="flex-1 pb-14 md:pb-0">
        {children}
      </main>
      <SiteFooter />

      {/* Menú de pantalla completa y barra inferior del celular. Van acá y no
          en el header porque el header tiene `backdrop-filter`, que rompe el
          `position: fixed` de sus hijos. */}
      <MobileNav
        categories={categories
          .filter((c) => !c.parentId)
          .map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image,
            count: stats.get(c.id)?.count ?? 0,
            brands: [],
            subcategories: categories
              .filter((h) => h.parentId === c.id)
              .map((h) => ({ name: h.name, slug: h.slug, count: stats.get(h.id)?.count ?? 0 })),
          }))}
        labels={{
          home: t.nav.home,
          categories: t.nav.categories,
          search: t.nav.search,
          order: t.nav.order,
          whatsapp: t.nav.whatsapp,
          close: t.nav.close,
        }}
        whatsappUrl={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
        canOrder={canSeePrices(role)}
      />

      {/* Botón flotante de WhatsApp: va en el layout y no en cada página, así
          acompaña al visitante por todo el catálogo. Lo ve cualquiera, con o
          sin sesión: es el canal de contacto general. */}
      <WhatsappFab
        number={config.whatsappNumber}
        label={t.common.whatsappFab}
        bubble={t.nav.fabBubble}
        closeLabel={t.nav.fabClose}
      />
    </>
  );
}
