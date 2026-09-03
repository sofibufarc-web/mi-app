import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { getStoreConfig } from "@/lib/data-source";
import { getT } from "@/lib/request-context";

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
  const [t, config] = await Promise.all([getT(), getStoreConfig()]);

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

      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />

      {/* Botón flotante de WhatsApp: va en el layout y no en cada página, así
          acompaña al visitante por todo el catálogo. Lo ve cualquiera, con o
          sin sesión: es el canal de contacto general. */}
      <WhatsappFab number={config.whatsappNumber} label={t.common.whatsappFab} />
    </>
  );
}
