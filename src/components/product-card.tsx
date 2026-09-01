import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import type { Product } from "@/data/types";
import { formatPrice } from "@/lib/format";

/**
 * Ficha de producto de la grilla. Compacta y densa, como corresponde a un
 * catálogo mayorista de reposición.
 *
 * Es un Server Component: no tiene estado. Lo único interactivo es el botón
 * de agregar, que sí es cliente.
 */
export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock === 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:border-brand/40 hover:shadow-sm">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square bg-surface"
      >
        <ProductImage src={product.images[0]} alt={product.name} />
        {product.featured && (
          <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Destacado
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sin stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            {product.brand}
          </p>
        )}

        <h3 className="text-sm leading-snug font-medium">
          <Link href={`/producto/${product.slug}`} className="hover:text-brand">
            {/* line-clamp-2 corta el nombre en 2 líneas para que todas las
                fichas de la fila midan lo mismo. */}
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h3>

        <p className="text-[11px] text-ink-soft">
          Cód. {product.sku}
          {product.unit ? ` · ${product.unit}` : ""}
        </p>

        <p className="mt-auto pt-2 text-lg font-bold text-brand">
          {formatPrice(product.price)}
        </p>

        <AddToCartButton
          className="mt-2"
          item={{
            productId: product.id,
            sku: product.sku,
            name: product.name,
            slug: product.slug,
            price: product.price,
            image: product.images[0],
          }}
        />
      </div>
    </article>
  );
}

/** Grilla estándar del catálogo: 2 / 3 / 4 columnas. */
export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
        No encontramos productos con esos criterios.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
