import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/product-form";
import { getCategories, getProductById } from "@/lib/data-source";
import { formatDate } from "@/lib/format";

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
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition hover:bg-surface"
          >
            Ver en la tienda ↗
          </Link>
        )}
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
