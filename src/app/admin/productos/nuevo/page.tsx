import Link from "next/link";

import { ProductForm } from "@/components/product-form";
import { getCategories } from "@/lib/data-source";

export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <nav className="text-xs text-ink-soft">
        <Link href="/admin/productos" className="hover:text-brand">
          Productos
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Nuevo</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>

      <ProductForm categories={categories} />
    </div>
  );
}
