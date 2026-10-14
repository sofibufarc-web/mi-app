import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  firstParam,
  numberParam,
} from "@/components/catalog-filters";
import { PriceGateBanner } from "@/components/price-gate";
import { ParentGrid } from "@/components/parent-card";
import { ParentFilters } from "@/components/parent-filters";
import type { ParentFilters as ParentFiltersType, ProductUsage } from "@/data/types";
import { Pagination } from "@/components/pagination";
import { getCategoryBySlug, getParentFacets, getParents, getStoreConfig } from "@/lib/data-source";
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

  // El catálogo lista PRODUCTOS (padres); sus colores y tamaños son variantes.
  // Con sesión se puede ordenar por precio; sin sesión se ignora en el servidor
  // (ver `withoutPriceFilters`): ordenar por precio dejaría deducir cuál es más caro.
  const sortPedido = firstParam(query.sort);
  const sort: ParentFiltersType["sort"] =
    showPrices && (sortPedido === "precio-asc" || sortPedido === "precio-desc")
      ? sortPedido
      : "nombre";
  const usoPedido = firstParam(query.usage);
  const filters: ParentFiltersType = {
    categoryId: category.id,
    search: firstParam(query.q),
    brand: firstParam(query.brand),
    size: firstParam(query.size),
    color: firstParam(query.color),
    usage: usoPedido === "interior" || usoPedido === "exterior" || usoPedido === "ambos"
      ? (usoPedido as ProductUsage)
      : undefined,
    finish: firstParam(query.finish),
    sort,
  };

  // Paginado: 24 productos por página (antes se traían los 636 de Pinturas).
  const POR_PAGINA = 24;
  const pagina = Math.max(1, numberParam(query.pagina) ?? 1);
  const [facets, resultado] = await Promise.all([
    getParentFacets(category.id),
    getParents({ ...filters, limit: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA }),
  ]);
  const { items: products, total } = resultado;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

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

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside>
            <ParentFilters
              action={`/categoria/${category.slug}`}
              facets={facets}
              t={t}
              showPriceFilters={showPrices}
              values={{
                q: firstParam(query.q),
                brand: firstParam(query.brand),
                size: firstParam(query.size),
                color: firstParam(query.color),
                usage: firstParam(query.usage),
                finish: firstParam(query.finish),
                sort: firstParam(query.sort),
              }}
            />
          </aside>

          <div>
            <p className="text-sm text-ink-soft">
              {total} {total === 1 ? t.common.product : t.common.products}
            </p>
            <div className="mt-3">
              <ParentGrid
                parents={products}
                ctx={{ showPrices, t, whatsappNumber: config.whatsappNumber }}
              />
            </div>
            <Pagination
              basePath={`/categoria/${category.slug}`}
              page={Math.min(pagina, totalPaginas)}
              totalPages={totalPaginas}
              params={{
                q: firstParam(query.q),
                brand: firstParam(query.brand),
                size: firstParam(query.size),
                color: firstParam(query.color),
                usage: firstParam(query.usage),
                finish: firstParam(query.finish),
                sort: firstParam(query.sort),
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
