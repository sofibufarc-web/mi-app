import Link from "next/link";

import { getCategoriesWithCount, getProducts } from "@/lib/data-source";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Panel" };

/** Tarjeta de número grande del dashboard. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-brand">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export default async function AdminHomePage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategoriesWithCount(),
  ]);

  const active = products.filter((p) => p.active);
  const featured = products.filter((p) => p.featured);
  const withoutCategory = products.filter((p) => !p.categoryId);
  const outOfStock = products.filter((p) => p.stock === 0);

  const averagePrice = active.length
    ? active.reduce((sum, p) => sum + p.price, 0) / active.length
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Desde acá administrás el catálogo, las categorías y la lista de precios.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Productos"
          value={String(products.length)}
          hint={`${active.length} visibles en el catálogo`}
        />
        <Stat label="Categorías" value={String(categories.length)} />
        <Stat label="Destacados" value={String(featured.length)} hint="Salen en la home" />
        <Stat
          label="Precio promedio"
          value={formatPrice(averagePrice)}
          hint="Sobre los productos activos"
        />
      </div>

      {(withoutCategory.length > 0 || outOfStock.length > 0) && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-bold">Cosas para revisar</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {withoutCategory.length > 0 && (
              <li>
                {withoutCategory.length} producto(s) sin categoría asignada.{" "}
                <Link
                  href="/admin/productos?categoria=sin-categoria"
                  className="font-medium text-brand underline"
                >
                  Ver
                </Link>
              </li>
            )}
            {outOfStock.length > 0 && (
              <li>{outOfStock.length} producto(s) con stock en cero.</li>
            )}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide">Accesos rápidos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/admin/productos/nuevo",
              title: "Cargar un producto",
              text: "Alta con imágenes, precio y categoría.",
            },
            {
              href: "/admin/precios",
              title: "Actualizar precios",
              text: "Subí el Excel del proveedor y confirmá los cambios.",
            },
            {
              href: "/admin/configuracion",
              title: "Datos de la tienda",
              text: "WhatsApp, contacto y textos de la home.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-sm"
            >
              <p className="font-semibold">{card.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{card.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Productos por categoría
        </h2>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between p-4">
              <Link
                href={`/admin/productos?categoria=${category.id}`}
                className="text-sm font-medium hover:text-brand"
              >
                {category.name}
              </Link>
              <span className="text-sm text-ink-soft">
                {category.productCount} producto(s)
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
