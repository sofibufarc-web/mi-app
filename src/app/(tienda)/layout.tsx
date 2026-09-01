import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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

export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
