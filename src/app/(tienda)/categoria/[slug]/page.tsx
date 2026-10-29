import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { firstParam, numberParam } from "@/components/catalog-filters";
import { JsonLd } from "@/components/json-ld";
import { PriceGateBanner } from "@/components/price-gate";
import { ParentGrid } from "@/components/parent-card";
import { FiltersToggle } from "@/components/filters-toggle";
import { ParentFilters } from "@/components/parent-filters";
import type {
  ParentFilters as ParentFiltersType,
  ProductUsage,
} from "@/data/types";
import { Pagination } from "@/components/pagination";
import {
  getCategories,
  getCategoryBySlug,
  getCategoryStats,
  getParentFacets,
  getParents,
  getStoreConfig,
} from "@/lib/data-source";
import { siteConfig } from "@/config/site";
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoría no encontrada", robots: { index: false } };

  const description =
    category.description ||
    `${category.name} al por mayor para pinturerías y ferreterías. Catálogo de Wiedmer, distribuidor mayorista en Rosario.`;

  // Canonical: la página 2, 3… son páginas propias (otros productos) y se
  // apuntan a sí mismas; los filtros (marca, color…) no: filtrar el mismo
  // listado no crea una página nueva, así que vuelven a la categoría.
  const pagina = numberParam(query.pagina);
  const url =
    pagina && pagina > 1
      ? `/categoria/${category.slug}?pagina=${pagina}`
      : `/categoria/${category.slug}`;

  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Wiedmer",
      locale: "es_AR",
      title: category.name,
      description,
      url,
    },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await getCategoryBySlug(slug);
  // notFound() corta el render y muestra la pantalla 404.
  if (!category) notFound();

  const [config, viewer, todas, stats] = await Promise.all([
    getStoreConfig(),
    getViewer(),
    getCategories(),
    getCategoryStats(),
  ]);
  const { t, showPrices } = viewer;

  // Una categoría puede tener subcategorías (Doble A → Lijas, Cintas, Varios)
  // o colgar de una. Un solo nivel.
  const padre = todas.find((c) => c.id === category.parentId);
  const hijas = todas.filter((c) => c.parentId === category.id);

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
    usage:
      usoPedido === "interior" ||
      usoPedido === "exterior" ||
      usoPedido === "ambos"
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
    getParents({
      ...filters,
      limit: POR_PAGINA,
      offset: (pagina - 1) * POR_PAGINA,
    }),
  ]);
  const { items: products, total } = resultado;
  // Cuántos filtros hay puestos (el orden no cuenta): el botón del celular lo muestra.
  const filtrosActivos = [
    filters.search,
    filters.brand,
    filters.size,
    filters.color,
    filters.usage,
    filters.finish,
  ].filter(Boolean).length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const migas = [
    { name: t.common.home, path: "/" },
    ...(padre ? [{ name: padre.name, path: `/categoria/${padre.slug}` }] : []),
    { name: category.name, path: `/categoria/${category.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: migas.map((miga, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: miga.name,
            item: `${siteConfig.url}${miga.path === "/" ? "" : miga.path}`,
          })),
        }}
      />
      {/*
        Portada de la categoría: ocupa TODO el ancho, igual que el hero de la
        home, para que las dos páginas se sientan de la misma familia.

        Las fotos miden 1200 px y en un monitor ancho se agrandan; sin ayuda se
        verían blandas. Por eso van detrás de velos oscuros: ocultan esa falta
        de nitidez y garantizan que el título blanco se lea sin importar qué
        foto toque.

        `min-h` y no `h`: fija un piso pero deja crecer si el título o las
        subcategorías ocupan más (en celular, por ejemplo).
      */}
      <header className="relative isolate overflow-hidden border-b border-line bg-brand-darker text-white">
        {category.image && (
          <Image
            src={category.image}
            // alt vacío a propósito: la foto es ilustrativa y el nombre de la
            // categoría ya está escrito encima como texto.
            alt=""
            fill
            sizes="100vw"
            quality={85}
            className="-z-20 object-cover object-[50%_55%] opacity-60"
            priority
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-black/40" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-darker/90 via-brand-darker/70 to-brand-darker/20"
        />
        {/* El texto va abajo: un tercer degradado, de abajo hacia arriba, lo oscurece más. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/50 via-transparent to-transparent"
        />

        <div className="container-wiedmer flex min-h-[15rem] flex-col justify-end py-8 sm:min-h-[19rem] lg:min-h-[24rem] lg:py-12">
          <div className="flex flex-col justify-end">
            <nav className="text-xs text-white/70">
              <Link href="/" className="transition hover:text-white">
                {t.common.home}
              </Link>
              <span className="mx-1.5">/</span>
              {padre && (
                <>
                  <Link
                    href={`/categoria/${padre.slug}`}
                    className="transition hover:text-white"
                  >
                    {padre.name}
                  </Link>
                  <span className="mx-1.5">/</span>
                </>
              )}
              <span className="text-white">{category.name}</span>
            </nav>

            <h1 className="animate-fade-up mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="animate-fade-up mt-4 max-w-xl text-sm leading-relaxed text-white/80 [animation-delay:120ms] sm:text-base">
                {category.description}
              </p>
            )}

            {hijas.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {hijas.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/categoria/${h.slug}`}
                      className="inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      {h.name}{" "}
                      <span className="font-normal text-white/70">
                        ({stats.get(h.id)?.count ?? 0})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <div className="container-wiedmer py-8">
        {!showPrices && (
          <div className="mb-6">
            <PriceGateBanner t={t} compact />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside>
            <FiltersToggle
              label={t.filters.toggle}
              activeCount={filtrosActivos}
            >
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
            </FiltersToggle>
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
