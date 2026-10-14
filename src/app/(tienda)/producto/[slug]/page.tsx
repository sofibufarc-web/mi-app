import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ParentGrid } from "@/components/parent-card";
import { PriceGateBanner } from "@/components/price-gate";
import { Reveal } from "@/components/reveal";
import { TechnicalTabs, type RelatedLite } from "@/components/technical-tabs";
import { VariantPicker, type VariantLite } from "@/components/variant-picker";
import {
  getCategoryById,
  getParentBySku,
  getParentBySlug,
  getParents,
  getProductBySlug,
  getProductsByIds,
  getStoreConfig,
} from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";

/**
 * Ficha de un PRODUCTO (padre). Sus colores y tamaños son variantes que se
 * eligen en la misma página; cada una tiene su URL: /producto/<slug>?codigo=36230
 */
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parent = await getParentBySlug(slug);
  if (!parent) return { title: "Producto no encontrado" };
  return {
    title: parent.name,
    description: parent.description.split("\n\n")[0]?.slice(0, 160) || undefined,
  };
}

export default async function ProductoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const codigo = Array.isArray(query.codigo) ? query.codigo[0] : query.codigo;

  const parent = await getParentBySlug(slug);
  if (!parent) {
    // Enlaces viejos (/producto/<slug de un artículo>): se llevan al padre,
    // con el código ya elegido.
    const viejo = await getProductBySlug(slug);
    if (viejo?.active) {
      const padre = await getParentBySku(viejo.sku);
      if (padre) redirect(`/producto/${padre.slug}?codigo=${encodeURIComponent(viejo.sku)}`);
    }
    notFound();
  }

  const [category, config, viewer] = await Promise.all([
    parent.categoryId ? getCategoryById(parent.categoryId) : null,
    getStoreConfig(),
    getViewer(),
  ]);
  const { t, showPrices } = viewer;

  // Al navegador solo viaja lo que puede ver: sin sesión, ningún precio.
  const variants: VariantLite[] = parent.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    color: v.color,
    colorHex: v.colorHex,
    sizeLabel: v.sizeLabel,
    image: v.images[0] && v.images[0] !== parent.images[0] ? v.images[0] : undefined,
    stock: v.stock,
    price: showPrices ? v.price : undefined,
  }));

  const images = parent.images.length
    ? parent.images
    : parent.variants.flatMap((v) => v.images).slice(0, 1);

  // Carpeta técnica y complementarios: solo con sesión.
  let related: RelatedLite[] = [];
  if (showPrices && parent.technical.complementarios?.length) {
    related = (await getProductsByIds(parent.technical.complementarios)).map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      price: p.price,
      image: p.images[0],
    }));
  }

  const { items: otros } = await getParents({
    categoryId: parent.categoryId || undefined,
    limit: 5,
  });
  const parecidos = otros.filter((p) => p.id !== parent.id).slice(0, 4);

  return (
    <div className="container-wiedmer pb-28 pt-8 lg:pb-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="transition hover:text-brand">
          {t.common.home}
        </Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/categoria/${category.slug}`} className="transition hover:text-brand">
              {category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-ink">{parent.name}</span>
      </nav>

      <div className="mt-6">
        <VariantPicker
          parent={{
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            brand: parent.brand,
            usage: parent.usage,
            images,
          }}
          variants={variants}
          initialSku={codigo ?? variants[0].sku}
          showPrices={showPrices}
          whatsappNumber={config.whatsappNumber}
          t={t}
        />
      </div>

      {parent.description && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">{t.product.description}</h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-ink-soft">
            {parent.description.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {showPrices && <TechnicalTabs technical={parent.technical} related={related} t={t.variants} />}

      {!showPrices && (
        <Reveal className="mt-12 block">
          <PriceGateBanner t={t} />
        </Reveal>
      )}

      {parecidos.length > 0 && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="text-xl font-bold tracking-tight">
            {t.product.related} {category?.name ?? t.product.relatedFallback}
          </h2>
          <div className="mt-5">
            <ParentGrid
              parents={parecidos}
              ctx={{ showPrices, t, whatsappNumber: config.whatsappNumber }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
