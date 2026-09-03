import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import {
  ProductPrice,
  WhatsappInquiryButton,
} from "@/components/price-gate";
import { ProductImage } from "@/components/product-image";
import { Reveal } from "@/components/reveal";
import type { Product } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * Lo que la grilla necesita saber además de los productos: en qué idioma
 * escribir, si mostrar precios y a qué WhatsApp mandar las consultas.
 *
 * Va todo junto en un objeto en vez de tres props sueltas para que agregar un
 * dato mañana no obligue a tocar las seis páginas que usan la grilla.
 */
export type CatalogContext = {
  showPrices: boolean;
  t: Dictionary;
  whatsappNumber: string;
};

/**
 * Ficha de producto de la grilla. Compacta y densa, como corresponde a un
 * catálogo mayorista de reposición.
 *
 * Es un Server Component: no tiene estado. Lo único interactivo es el botón de
 * agregar, que sí es cliente — y que ni siquiera se renderiza si el visitante
 * no inició sesión.
 */
export function ProductCard({
  product,
  ctx,
}: {
  product: Product;
  ctx: CatalogContext;
}) {
  const { showPrices, t, whatsappNumber } = ctx;
  const outOfStock = product.stock === 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        {/* El zoom va en un div interno y no en la imagen directamente para
            que el `overflow-hidden` del Link recorte lo que se sale. */}
        <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
          <ProductImage src={product.images[0]} alt={product.name} />
        </div>

        {product.featured && (
          <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-brand">
            {t.product.featured}
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-page">
            {t.product.outOfStock}
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
          <Link href={`/producto/${product.slug}`} className="transition hover:text-brand">
            {/* line-clamp-2 corta el nombre en 2 líneas para que todas las
                fichas de la fila midan lo mismo. */}
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h3>

        <p className="text-[11px] text-ink-soft">
          {t.common.code} {product.sku}
          {product.unit ? ` · ${product.unit}` : ""}
        </p>

        {/* mt-auto empuja el precio y el botón al fondo de la ficha, así todas
            las de la fila alinean el botón a la misma altura. */}
        <div className="mt-auto pt-2">
          <ProductPrice price={product.price} showPrices={showPrices} t={t} />
        </div>

        {showPrices ? (
          <AddToCartButton
            className="mt-2"
            t={t.product}
            item={{
              productId: product.id,
              sku: product.sku,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image: product.images[0],
            }}
          />
        ) : (
          <WhatsappInquiryButton
            className="mt-2 h-9"
            productName={product.name}
            sku={product.sku}
            whatsappNumber={whatsappNumber}
            t={t}
          />
        )}
      </div>
    </article>
  );
}

/** Grilla estándar del catálogo: 2 / 3 / 4 columnas. */
export function ProductGrid({
  products,
  ctx,
}: {
  products: Product[];
  ctx: CatalogContext;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
        {ctx.t.product.empty}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        // Las fichas entran en cascada al llegar a la pantalla. El retraso se
        // calcula por posición DENTRO DE LA FILA (index % 4) y no por índice
        // absoluto: si no, la ficha número 40 esperaría 3 segundos.
        <Reveal key={product.id} delay={(index % 4) * 70} className="h-full">
          <ProductCard product={product} ctx={ctx} />
        </Reveal>
      ))}
    </div>
  );
}
