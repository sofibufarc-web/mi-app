import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/product-form";
import { getCategories, getParentById, getProductById } from "@/lib/data-source";
import { formatDate, formatPrice } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? `Editar ${product.name}` : "Producto no encontrado" };
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);

  if (!product) notFound();

  const parent = product.parentId ? await getParentById(product.parentId) : null;
  const category = categories.find((c) => c.id === product.categoryId);
  const siblings = parent?.variants.filter((v) => v.id !== product.id) ?? [];

  const resumen: [string, string][] = [
    ["ID interno", product.id],
    ["Código", product.sku],
    ["Precio actual", formatPrice(product.price)],
    ["Categoría", category?.name ?? "Sin categoría"],
    ["Producto padre", parent?.name ?? "Sin asignar (ver Pendientes)"],
    ["Color", product.color ?? "—"],
    ["Tamaño", product.sizeLabel ?? "—"],
    ["Fotos", String(product.images.length)],
    [
      "Estado",
      `${product.active ? "Visible" : "Oculto"}${product.featured ? " · destacado" : ""}`,
    ],
  ];

  return (
    <div className="space-y-6">
      <nav className="text-xs text-ink-soft">
        <Link href="/admin/productos" className="hover:text-brand">
          Productos
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar producto</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Creado el {formatDate(product.createdAt)} · última modificación{" "}
            {formatDate(product.updatedAt)}
          </p>
        </div>

        {product.active && (
          <Link
            href={`/producto/${product.slug}`}
            target="_blank"
            className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium transition hover:bg-surface"
          >
            Ver en la tienda ↗
          </Link>
        )}
      </div>

      <section className="rounded-lg border border-line bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Resumen</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {resumen.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {siblings.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs font-semibold text-ink-soft">
              Otras variantes de “{parent?.name}” ({siblings.length})
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {siblings.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/admin/productos/${v.id}`}
                    className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs transition hover:bg-surface"
                  >
                    {[v.color, v.sizeLabel].filter(Boolean).join(" · ") || v.sku}
                    <span
                      className={
                        v.stock === 0
                          ? "font-bold text-red-600 dark:text-red-400"
                          : "text-ink-soft"
                      }
                    >
                      {v.stock === 0
                        ? "sin stock"
                        : v.stock == null
                          ? "disponible"
                          : `${v.stock} u.`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
