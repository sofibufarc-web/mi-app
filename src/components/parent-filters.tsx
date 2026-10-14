import type { ParentFacets } from "@/data/types";
import type { Dictionary } from "@/lib/i18n";

export type ParentFilterValues = {
  q?: string;
  brand?: string;
  size?: string;
  color?: string;
  usage?: string;
  finish?: string;
  sort?: string;
};

/**
 * Filtros laterales del catálogo.
 *
 * Igual que `CatalogFilters`, es un <form> GET: los filtros quedan en la URL
 * (se comparte el link, anda "atrás", funciona sin JavaScript). Las opciones de
 * cada lista salen de lo que REALMENTE existe en la categoría (`facets`), así
 * nunca se ofrece un filtro que devuelva cero resultados.
 */
export function ParentFilters({
  action,
  facets,
  values,
  t,
  showPriceFilters,
}: {
  action: string;
  facets: ParentFacets;
  values: ParentFilterValues;
  t: Dictionary;
  showPriceFilters: boolean;
}) {
  const v = t.variants;
  const campo =
    "h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  const lista = (
    name: keyof ParentFilterValues,
    label: string,
    options: { value: string; label: string }[],
  ) =>
    options.length > 1 && (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
        <select name={name} defaultValue={values[name] ?? ""} className={campo}>
          <option value="">{v.anyOption}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );

  const usoEtiqueta = { interior: v.interior, exterior: v.exterior, ambos: v.both } as const;

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 lg:sticky lg:top-28"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t.filters.search}
        </span>
        <input
          type="search"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder={t.filters.searchPlaceholder}
          className={campo}
        />
      </label>

      {lista("brand", v.filterBrand, facets.brands.map((b) => ({ value: b, label: b })))}
      {lista("size", v.filterSize, facets.sizes.map((s) => ({ value: s, label: s })))}
      {lista("color", v.filterColor, facets.colors.map((c) => ({ value: c.name, label: c.name })))}
      {lista(
        "usage",
        v.filterUsage,
        facets.usages.map((u) => ({ value: u, label: usoEtiqueta[u] })),
      )}
      {lista("finish", v.filterFinish, facets.finishes.map((f) => ({ value: f, label: f })))}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t.filters.sortBy}
        </span>
        <select name="sort" defaultValue={values.sort ?? "nombre"} className={campo}>
          <option value="nombre">{t.filters.sortName}</option>
          {showPriceFilters && (
            <>
              <option value="precio-asc">{t.filters.sortPriceAsc}</option>
              <option value="precio-desc">{t.filters.sortPriceDesc}</option>
            </>
          )}
        </select>
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary h-10 flex-1 text-sm">
          {t.filters.apply}
        </button>
        <a
          href={action}
          className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
        >
          {t.filters.clear}
        </a>
      </div>
    </form>
  );
}
