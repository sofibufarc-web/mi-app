import Link from "next/link";

import { firstParam } from "@/components/catalog-filters";
import { DeleteProductButton } from "@/components/delete-product-button";
import { ProductImage } from "@/components/product-image";
import { getCategories, getProducts } from "@/lib/data-source";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Productos" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminProductosPage({ searchParams }: Props) {
  const query = await searchParams;
  const search = firstParam(query.q) ?? "";
  const categoria = firstParam(query.categoria) ?? "";

  const categories = await getCategories();

  // "sin-categoria" es un valor especial del filtro: no es un id real.
  const allProducts = await getProducts({ search: search || undefined });
  const products =
    categoria === "sin-categoria"
      ? allProducts.filter((p) => !p.categoryId)
      : categoria
        ? allProducts.filter((p) => p.categoryId === categoria)
        : allProducts;

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {products.length} de {allProducts.length} producto(s)
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Avisos que llegan por query string después de guardar o borrar. */}
      {query.guardado && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Producto guardado correctamente.
        </p>
      )}
      {query.borrado && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Producto eliminado.
        </p>
      )}

      <form
        action="/admin/productos"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-4"
      >
        <label className="flex flex-1 basis-56 flex-col gap-1">
          <span className="text-xs font-semibold text-ink-soft">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Nombre, código o marca"
            className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="flex basis-56 flex-col gap-1">
          <span className="text-xs font-semibold text-ink-soft">Categoría</span>
          <select
            name="categoria"
            defaultValue={categoria}
            className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="sin-categoria">— Sin categoría —</option>
          </select>
        </label>

        <button
          type="submit"
          className="h-10 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
        >
          Filtrar
        </button>
        <Link
          href="/admin/productos"
          className="h-10 rounded-md border border-line px-4 text-sm font-medium leading-10 text-ink-soft transition hover:bg-surface"
        >
          Limpiar
        </Link>
      </form>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-card p-10 text-center text-sm text-ink-soft">
          No hay productos con esos criterios.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-line bg-surface">
                <ProductImage src={product.images[0]} alt={product.name} sizes="56px" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/productos/${product.id}`}
                    className="text-sm font-semibold hover:text-brand"
                  >
                    {product.name}
                  </Link>
                  {!product.active && (
                    <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                      Oculto
                    </span>
                  )}
                  {product.featured && (
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                      Destacado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Cód. {product.sku} ·{" "}
                  {categoryName.get(product.categoryId) ?? "Sin categoría"}
                  {product.stock !== null && product.stock !== undefined
                    ? ` · stock ${product.stock}`
                    : ""}
                </p>
              </div>

              <p className="w-28 shrink-0 text-sm font-bold text-brand">
                {formatPrice(product.price)}
              </p>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface"
                >
                  Editar
                </Link>
                <DeleteProductButton id={product.id} name={product.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
