import Link from "next/link";

import {
  CatalogFilters,
  firstParam,
  numberParam,
} from "@/components/catalog-filters";
import { ProductGrid } from "@/components/product-card";
import type { ProductFilters } from "@/data/types";
import { getProducts } from "@/lib/data-source";

export const metadata = { title: "Búsqueda" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Resultados del buscador del header: /buscar?q=rodillo */
export default async function BuscarPage({ searchParams }: Props) {
  const query = await searchParams;
  const term = firstParam(query.q)?.trim() ?? "";

  const filters: ProductFilters = {
    onlyActive: true,
    search: term || undefined,
    minPrice: numberParam(query.min),
    maxPrice: numberParam(query.max),
    sort: (firstParam(query.sort) as ProductFilters["sort"]) ?? "nombre",
  };

  const products = term ? await getProducts(filters) : [];

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Búsqueda</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        {term ? `Resultados para “${term}”` : "Buscar productos"}
      </h1>

      <div className="mt-6">
        <CatalogFilters
          action="/buscar"
          defaults={{
            q: term,
            min: firstParam(query.min),
            max: firstParam(query.max),
            sort: firstParam(query.sort),
          }}
        />
      </div>

      {term ? (
        <>
          <p className="mt-6 text-sm text-ink-soft">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </p>
          <div className="mt-3">
            <ProductGrid products={products} />
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
          Escribí el nombre o el código del artículo que buscás.
        </p>
      )}
    </div>
  );
}
