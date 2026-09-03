import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CatalogFilters,
  firstParam,
  numberParam,
  withoutPriceFilters,
} from "@/components/catalog-filters";
import { PriceGateBanner } from "@/components/price-gate";
import { ProductGrid } from "@/components/product-card";
import type { ProductFilters } from "@/data/types";
import { getCategoryBySlug, getProducts, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";

/**
 * Página de categoría: /categoria/pinturas
 *
 * Cada categoría vive en su propia URL. Eso significa que se puede compartir el
 * link, que el botón "atrás" funciona y que Google puede indexar cada rubro por
 * separado — cosas que se pierden si los productos se despliegan abajo de la
 * home con JavaScript.
 *
 * En Next 15+ `params` y `searchParams` llegan como Promesas y hay que
 * esperarlas con `await`. Es así porque el servidor puede empezar a renderizar
 * antes de conocerlas.
 */
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoría no encontrada" };
  return { title: category.name, description: category.description };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await getCategoryBySlug(slug);
  // notFound() corta el render y muestra la pantalla 404.
  if (!category) notFound();

  const [config, viewer] = await Promise.all([getStoreConfig(), getViewer()]);
  const { t, showPrices } = viewer;

  const filters: ProductFilters = withoutPriceFilters(
    {
      categoryId: category.id,
      onlyActive: true,
      search: firstParam(query.q),
      minPrice: numberParam(query.min),
      maxPrice: numberParam(query.max),
      sort: (firstParam(query.sort) as ProductFilters["sort"]) ?? "nombre",
    },
    showPrices,
  );

  const products = await getProducts(filters);

  return (
    <>
      {/*
        Cabecera de la categoría: la foto del rubro a todo lo ancho, con el
        título encima.

        Las tres capas están en este orden y cada una tiene su razón:

        1. La foto (`object-cover` la recorta para llenar la franja sin
           deformarla; `priority` le dice a Next que la cargue primero, porque
           es lo primero que se ve al entrar).
        2. Un velo azul parejo, que baja el contraste general de la foto.
        3. Un degradado horizontal, casi opaco del lado del texto y
           transparente del otro. Esto NO es decoración: garantiza que el
           título blanco se lea sobre cualquier foto, incluida una clara como
           la de lijas. Sin él habría que elegir entre foto visible o texto
           legible; con él se pueden las dos cosas, porque el texto vive
           siempre en la mitad izquierda.

        Las opacidades (20% el velo, 95%→60%→0% el degradado) están medidas
        contra la foto más clara del set. Si algún día se suma una categoría
        con una foto muy luminosa, hay que volver a mirarlas.
      */}
      <header className="relative isolate overflow-hidden border-b border-line bg-brand-darker text-white">
        {category.image && (
          <Image
            src={category.image}
            // alt vacío a propósito: la foto es ilustrativa y el nombre de la
            // categoría ya está escrito al lado como texto. Describirla otra
            // vez sería ruido para quien usa un lector de pantalla.
            alt=""
            fill
            sizes="100vw"
            className="animate-slow-zoom object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-brand-darker/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker/95 via-brand-darker/60 to-transparent" />

        <div className="container-wiedmer relative py-16 lg:py-24">
          <nav className="text-xs text-white/60">
            <Link href="/" className="transition hover:text-white">
              {t.common.home}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">{category.name}</span>
          </nav>

          <h1 className="animate-fade-up mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="animate-fade-up mt-3 max-w-2xl text-sm leading-relaxed text-white/70 [animation-delay:120ms]">
              {category.description}
            </p>
          )}
        </div>
      </header>

      <div className="container-wiedmer py-8">
        {!showPrices && (
          <div className="mb-8">
            <PriceGateBanner t={t} />
          </div>
        )}

        <CatalogFilters
          action={`/categoria/${category.slug}`}
          t={t}
          showPriceFilters={showPrices}
          defaults={{
            q: firstParam(query.q),
            min: firstParam(query.min),
            max: firstParam(query.max),
            sort: firstParam(query.sort),
          }}
        />

        <p className="mt-6 text-sm text-ink-soft">
          {products.length}{" "}
          {products.length === 1 ? t.common.product : t.common.products}
        </p>

        {/* La grilla ya anima cada ficha por separado (ver ProductGrid), así
            que acá no hace falta envolver nada más. */}
        <div className="mt-3">
          <ProductGrid
            products={products}
            ctx={{ showPrices, t, whatsappNumber: config.whatsappNumber }}
          />
        </div>
      </div>
    </>
  );
}
