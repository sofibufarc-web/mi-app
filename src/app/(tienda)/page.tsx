import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/product-card";
import { getCategories, getProducts, getStoreConfig } from "@/lib/data-source";

/**
 * Home.
 *
 * Server Component `async`: pide los datos en el servidor y manda al navegador
 * el HTML ya armado. No hay spinners ni fetch desde el cliente.
 */
export default async function HomePage() {
  const [config, categories, featured, recent] = await Promise.all([
    getStoreConfig(),
    getCategories(),
    getProducts({ featured: true, onlyActive: true }),
    getProducts({ onlyActive: true, sort: "recientes" }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-darker text-white">
        <div className="container-wiedmer grid gap-8 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">
              Rosario · Desde 1970
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {config.welcomeTitle}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              {config.welcomeText}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/categoria/pinturas"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-darker transition hover:bg-white/90"
              >
                Ver catálogo
              </Link>
              <Link
                href="/carrito"
                className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Mi pedido
              </Link>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Entrega en Gran Rosario", "Reparto propio con frecuencia semanal."],
              ["Precios mayoristas", "Lista de precios actualizada permanentemente."],
              ["Pedido por WhatsApp", "Armá el carrito y te contactamos para cerrar."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-lg bg-white/5 p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-white/60">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categorías */}
      <section className="container-wiedmer py-12">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Categorías</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Todo lo que necesita una pinturería o ferretería, en un solo proveedor.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:border-brand/40 hover:shadow-sm"
            >
              <div className="relative aspect-4/3 bg-surface">
                {category.image && (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 16vw, 45vw"
                    className="object-cover"
                  />
                )}
              </div>
              <span className="p-3 text-sm font-semibold group-hover:text-brand">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Destacados */}
      {featured.length > 0 && (
        <section className="border-y border-line bg-surface py-12">
          <div className="container-wiedmer">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Productos destacados
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Los que más salen de nuestro depósito.
            </p>
            <div className="mt-6">
              <ProductGrid products={featured} />
            </div>
          </div>
        </section>
      )}

      {/* Novedades: los 8 más recientes */}
      <section className="container-wiedmer py-12">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Últimos ingresos
        </h2>
        <div className="mt-6">
          <ProductGrid products={recent.slice(0, 8)} />
        </div>
      </section>
    </>
  );
}
