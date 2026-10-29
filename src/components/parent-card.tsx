import Link from "next/link";

import { ParentCardMedia } from "@/components/parent-card-media";
import { QuickAdd, type QuickAddLabels } from "@/components/quick-add";
import type { CatalogContext } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { WhatsappInquiryButton } from "@/components/price-gate";
import type { ProductParent } from "@/data/types";
import { formatPrice } from "@/lib/format";

/** Tamaños distintos de las variantes, ya ordenados. */
function tamanosDe(parent: ProductParent): string[] {
  const vistos: string[] = [];
  for (const v of parent.variants) {
    if (v.sizeLabel && !vistos.includes(v.sizeLabel)) vistos.push(v.sizeLabel);
  }
  return vistos;
}

/**
 * Tarjeta de catálogo: UN producto, con sus colores y tamaños como variantes.
 *
 * Server Component. El precio solo se calcula y se escribe si `showPrices`:
 * al anónimo no le llega ni el número ni el cálculo del "desde".
 */
export function ParentCard({
  parent,
  ctx,
}: {
  parent: ProductParent;
  ctx: CatalogContext;
}) {
  const { showPrices, t, whatsappNumber } = ctx;
  const v = t.variants;

  const colores = new Map<string, { color: string; hex?: string; image?: string }>();
  for (const variant of parent.variants) {
    if (variant.color && !colores.has(variant.color)) {
      colores.set(variant.color, {
        color: variant.color,
        hex: variant.colorHex,
        // Solo cuenta como "foto por color" si difiere de la del padre.
        image:
          variant.images[0] && variant.images[0] !== parent.images[0]
            ? variant.images[0]
            : undefined,
      });
    }
  }
  const sizes = tamanosDe(parent);
  const resumen = [
    sizes.length > 0 ? `${sizes.length} ${sizes.length === 1 ? v.presentation : v.presentations}` : null,
    colores.size > 0 ? `${colores.size} ${colores.size === 1 ? v.color : v.colors}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Solo los textos que usa el agregado rápido, no el diccionario entero: todo lo
  // que se le pasa a un componente cliente viaja al navegador.
  const labels: QuickAddLabels = {
    add: v.quickAdd,
    chooseOptions: v.chooseOptions,
    inOrder: v.inOrder,
    close: v.closeSheet,
    pickColor: v.pickColor,
    pickSize: v.pickSize,
    code: v.code,
    addToOrder: v.addToOrder,
    added: v.addedToOrder,
    outOfStock: t.product.outOfStock,
    decrease: t.product.decreaseAria,
    increase: t.product.increaseAria,
    quantity: t.product.quantityAria,
  };

  const href = `/producto/${parent.slug}`;
  const image = parent.images[0] ?? parent.variants.find((x) => x.images[0])?.images[0];
  const desde = Math.min(...parent.variants.map((x) => x.price));
  // stock === 0 es "marcado sin stock"; null/undefined = no se controla (hay).
  // El padre se muestra agotado solo si TODAS sus variantes lo están: si queda
  // un color o un tamaño disponible, el producto se puede seguir pidiendo.
  const sinStock = parent.variants.every((x) => x.stock === 0);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10">
      <ParentCardMedia
        href={href}
        name={parent.name}
        transitionName={`prod-${parent.id}`}
        image={image}
        swatches={[...colores.values()]}
        brand={parent.brand}
        viewLabel={v.viewVariants}
        outOfStockLabel={sinStock ? t.product.outOfStock : undefined}
      />

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm leading-snug font-semibold">
          <Link href={href} className="transition hover:text-brand">
            <span className="line-clamp-2">{parent.name}</span>
          </Link>
        </h3>

        {resumen && <p className="text-[11px] text-ink-soft">{resumen}</p>}

        {sizes.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {sizes.slice(0, 5).map((s) => (
              <li
                key={s}
                className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
              >
                {s}
              </li>
            ))}
            {sizes.length > 5 && (
              <li className="text-[10px] leading-5 text-ink-soft">+{sizes.length - 5}</li>
            )}
          </ul>
        )}

        <div className="mt-auto pt-2">
          {showPrices ? (
            <>
              <p className="animate-fade-in text-lg font-bold text-accent-text [animation-duration:600ms]" style={{ animationDelay: "calc(var(--reveal-delay, 0ms) + 250ms)" }}>
                {parent.variants.length > 1 && (
                  <span className="mr-1 text-[11px] font-medium text-ink-soft">{v.from}</span>
                )}
                {formatPrice(desde)}
              </p>
              {/* Agregar sin entrar a la ficha. Va dentro de `showPrices`: los
                  precios que recibe nunca llegan a un visitante anónimo. */}
              <div className="mt-2">
                <QuickAdd
                  parent={{ name: parent.name, slug: parent.slug, image }}
                  variants={parent.variants.map((x) => ({
                    id: x.id,
                    sku: x.sku,
                    color: x.color,
                    colorHex: x.colorHex,
                    sizeLabel: x.sizeLabel,
                    image: x.images[0] && x.images[0] !== parent.images[0] ? x.images[0] : undefined,
                    price: x.price,
                    stock: x.stock,
                  }))}
                  labels={labels}
                />
              </div>
            </>
          ) : (
            <WhatsappInquiryButton
              className="h-9"
              productName={parent.name}
              sku={parent.variants[0].sku}
              whatsappNumber={whatsappNumber}
              t={t}
            />
          )}
        </div>
      </div>
    </article>
  );
}

/** Grilla de padres: 2 / 3 / 4 columnas, con aparición escalonada por fila. */
export function ParentGrid({
  parents,
  ctx,
}: {
  parents: ProductParent[];
  ctx: CatalogContext;
}) {
  if (parents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
        {ctx.t.product.empty}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {parents.map((parent, index) => (
        <Reveal key={parent.id} delay={(index % 4) * 60} className="h-full">
          <ParentCard parent={parent} ctx={ctx} />
        </Reveal>
      ))}
    </div>
  );
}
