import Link from "next/link";

import { CatalogFilters, firstParam } from "@/components/catalog-filters";
import { PriceGateBanner } from "@/components/price-gate";
import { ParentGrid } from "@/components/parent-card";
import { getParents, getStoreConfig } from "@/lib/data-source";
import { getViewer } from "@/lib/request-context";

export const metadata = { title: "Búsqueda", robots: { index: false } };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Resultados del buscador del header: /buscar?q=rodillo */
export default async function BuscarPage({ searchParams }: Props) {
  const query = await searchParams;
  const term = firstParam(query.q)?.trim() ?? "";

  const [config, viewer] = await Promise.all([getStoreConfig(), getViewer()]);
  const { t, showPrices } = viewer;

  const sortPedido = firstParam(query.sort);
  const sort =
    showPrices && (sortPedido === "precio-asc" || sortPedido === "precio-desc")
      ? sortPedido
      : "nombre";

  // Busca por nombre, marca o CÓDIGO (el código exacto encuentra su producto).
  const { items: products, total } = term
    ? await getParents({ search: term, sort, limit: 48 })
    : { items: [], total: 0 };

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="transition hover:text-brand">
          {t.common.home}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{t.common.search}</span>
      </nav>

      <h1 className="animate-fade-up mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        {term ? `${t.search.resultsFor} “${term}”` : t.search.title}
      </h1>

      {!showPrices && (
        <div className="mt-6">
          <PriceGateBanner t={t} />
        </div>
      )}

      <div className="mt-6">
        <CatalogFilters
          action="/buscar"
          t={t}
          showPriceFilters={showPrices}
          showPriceRange={false}
          defaults={{
            q: term,
            sort: firstParam(query.sort),
          }}
        />
      </div>

      {term ? (
        <>
          <p className="mt-6 text-sm text-ink-soft">
            {total}{" "}
            {total === 1 ? t.common.product : t.common.products}
          </p>
          <div className="mt-3">
            <ParentGrid
              parents={products}
              ctx={{ showPrices, t, whatsappNumber: config.whatsappNumber }}
            />
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
          {t.search.hint}
        </p>
      )}
    </div>
  );
}
