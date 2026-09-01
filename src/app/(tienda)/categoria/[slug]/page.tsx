import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CatalogFilters,
  firstParam,
  numberParam,
} from "@/components/catalog-filters";
import { ProductGrid } from "@/components/product-card";
import type { ProductFilters } from "@/data/types";
import { getCategoryBySlug, getProducts } from "@/lib/data-source";

/**
 * Página de categoría: /categoria/pinturas
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

  const filters: ProductFilters = {
    categoryId: category.id,
    onlyActive: true,
    search: firstParam(query.q),
    minPrice: numberParam(query.min),
    maxPrice: numberParam(query.max),
    sort: (firstParam(query.sort) as ProductFilters["sort"]) ?? "nombre",
  };

  const products = await getProducts(filters);

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{category.name}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">{category.description}</p>
      )}

      <div className="mt-6">
        <CatalogFilters
          action={`/categoria/${category.slug}`}
          defaults={{
            q: firstParam(query.q),
            min: firstParam(query.min),
            max: firstParam(query.max),
            sort: firstParam(query.sort),
          }}
        />
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </p>

      <div className="mt-3">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
