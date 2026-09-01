/**
 * Filtros del catálogo: búsqueda, rango de precio y orden.
 *
 * Es un <form> con method GET, así que al enviarlo la URL queda con los
 * filtros (`?q=rodillo&max=10000&sort=precio-asc`). Ventajas: se puede
 * compartir el link, funciona el botón "atrás" del navegador y anda sin
 * JavaScript. Por eso no hace falta que sea Client Component.
 */
export function CatalogFilters({
  action,
  defaults,
}: {
  /** A dónde envía el form. Ej: "/categoria/pinturas" */
  action: string;
  defaults: { q?: string; min?: string; max?: string; sort?: string };
}) {
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <label className="flex flex-1 basis-52 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Buscar</span>
        <input
          type="search"
          name="q"
          defaultValue={defaults.q ?? ""}
          placeholder="Nombre o código"
          className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="flex basis-28 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Precio desde</span>
        <input
          type="number"
          name="min"
          min={0}
          defaultValue={defaults.min ?? ""}
          placeholder="0"
          className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="flex basis-28 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Precio hasta</span>
        <input
          type="number"
          name="max"
          min={0}
          defaultValue={defaults.max ?? ""}
          placeholder="Sin tope"
          className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="flex basis-44 flex-col gap-1">
        <span className="text-xs font-semibold text-ink-soft">Ordenar por</span>
        <select
          name="sort"
          defaultValue={defaults.sort ?? "nombre"}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        >
          <option value="nombre">Nombre (A-Z)</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
          <option value="recientes">Más recientes</option>
        </select>
      </label>

      <button
        type="submit"
        className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Aplicar
      </button>

      <a
        href={action}
        className="h-10 rounded-md border border-line bg-white px-4 text-sm font-medium leading-10 text-ink-soft transition hover:bg-white/60"
      >
        Limpiar
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
