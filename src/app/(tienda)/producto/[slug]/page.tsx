import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-card";
import {
  getCategoryById,
  getProductBySlug,
  getProducts,
} from "@/lib/data-source";
import { formatPrice } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: product.name,
    // La descripción tiene párrafos; para el <meta> alcanza el primero.
    description: product.description.split("\n\n")[0]?.slice(0, 160),
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // Los productos inactivos no se muestran en el catálogo público.
  if (!product || !product.active) notFound();

  const category = product.categoryId
    ? await getCategoryById(product.categoryId)
    : null;

  // Relacionados: misma categoría, sin contar el producto actual.
  const related = (
    await getProducts({ categoryId: product.categoryId, onlyActive: true })
  )
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/categoria/${category.slug}`} className="hover:text-brand">
              {category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              {product.brand}
            </p>
          )}

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {product.name}
          </h1>

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            <div className="flex gap-1">
              <dt className="font-semibold">Código:</dt>
              <dd>{product.sku}</dd>
            </div>
            {product.unit && (
              <div className="flex gap-1">
                <dt className="font-semibold">Presentación:</dt>
                <dd>{product.unit}</dd>
              </div>
            )}
            {typeof product.stock === "number" && (
              <div className="flex gap-1">
                <dt className="font-semibold">Stock:</dt>
                <dd>{product.stock > 0 ? `${product.stock} u.` : "Sin stock"}</dd>
              </div>
            )}
          </dl>

          <p className="mt-6 text-3xl font-bold text-brand">
            {formatPrice(product.price)}
          </p>
          <p className="text-xs text-ink-soft">Precio unitario, IVA no incluido.</p>

          <AddToCartButton
            className="mt-6 max-w-md"
            withQuantity
            item={{
              productId: product.id,
              sku: product.sku,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image: product.images[0],
            }}
          />

          {product.description && (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide">
                Descripción
              </h2>
              {/* La descripción guarda párrafos separados por línea en blanco.
                  Los partimos y renderizamos un <p> por cada uno. */}
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                {product.description.split("\n\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="text-xl font-bold tracking-tight">
            Otros productos de {category?.name ?? "la tienda"}
          </h2>
          <div className="mt-5">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </div>
  );
}
