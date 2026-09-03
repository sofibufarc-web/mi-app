import type { Dictionary } from "@/lib/i18n";

/**
 * Filtros del catálogo: búsqueda, rango de precio y orden.
 *
 * Es un <form> con method GET, así que al enviarlo la URL queda con los
 * filtros (`?q=rodillo&max=10000&sort=precio-asc`). Ventajas: se puede
 * compartir el link, funciona el botón "atrás" del navegador y anda sin
 * JavaScript. Por eso no hace falta que sea Client Component.
 *
 * `showPriceFilters` es false para el visitante sin sesión: no tendría sentido
 * ofrecerle filtrar por un precio que no puede ver, y además ordenar por
 * precio le dejaría deducir cuál es más caro que cuál.
 */
export function CatalogFilters({
  action,
  defaults,
  t,
  showPriceFilters = true,
}: {
  /** A dónde envía el form. Ej: "/categoria/pinturas" */
  action: string;
  defaults: { q?: string; min?: string; max?: string; sort?: string };
  t: Dictionary;
  showPriceFilters?: boolean;
}) {
  const inputClass =
    "h-10 rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <label className="flex flex-1 basis-52 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">{t.filters.search}</span>
        <input
          type="search"
          name="q"
          defaultValue={defaults.q ?? ""}
          placeholder={t.filters.searchPlaceholder}
          className={inputClass}
        />
      </label>

      {showPriceFilters && (
        <>
          <label className="flex basis-28 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">
              {t.filters.priceFrom}
            </span>
            <input
              type="number"
              name="min"
              min={0}
              defaultValue={defaults.min ?? ""}
              placeholder="0"
              className={inputClass}
            />
          </label>

          <label className="flex basis-28 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">
              {t.filters.priceTo}
            </span>
            <input
              type="number"
              name="max"
              min={0}
              defaultValue={defaults.max ?? ""}
              placeholder={t.filters.noCap}
              className={inputClass}
            />
          </label>
        </>
      )}

      <label className="flex basis-44 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">{t.filters.sortBy}</span>
        <select
          name="sort"
          defaultValue={defaults.sort ?? "nombre"}
          className={inputClass}
        >
          <option value="nombre">{t.filters.sortName}</option>
          {showPriceFilters && (
            <>
              <option value="precio-asc">{t.filters.sortPriceAsc}</option>
              <option value="precio-desc">{t.filters.sortPriceDesc}</option>
            </>
          )}
          <option value="recientes">{t.filters.sortRecent}</option>
        </select>
      </label>

      <button
        type="submit"
        className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
      >
        {t.filters.apply}
      </button>

      <a
        href={action}
        className="h-10 rounded-md border border-line bg-card px-4 text-sm font-medium leading-10 text-ink-soft transition hover:border-brand hover:text-brand"
      >
        {t.filters.clear}
      </a>
    </form>
  );
}

/** Convierte un searchParam (que puede venir repetido) en string. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Convierte un searchParam a número, o undefined si no es válido. */
export function numberParam(
  value: string | string[] | undefined,
): number | undefined {
  const raw = firstParam(value);
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Saca de los filtros todo lo que dependa del precio cuando el visitante no
 * tiene permiso para verlos.
 *
 * No alcanza con esconder los campos del formulario: cualquiera puede escribir
 * `?sort=precio-asc` a mano en la barra de direcciones y, aunque no vea los
 * números, deducir de un vistazo cuál es el artículo más caro del rubro. El
 * filtro se aplica en el servidor, así que es en el servidor donde hay que
 * anularlo.
 */
export function withoutPriceFilters<
  T extends { minPrice?: number; maxPrice?: number; sort?: string },
>(filters: T, showPrices: boolean): T {
  if (showPrices) return filters;

  const sortsByPrice =
    filters.sort === "precio-asc" || filters.sort === "precio-desc";

  return {
    ...filters,
    minPrice: undefined,
    maxPrice: undefined,
    sort: sortsByPrice ? "nombre" : filters.sort,
  };
}
