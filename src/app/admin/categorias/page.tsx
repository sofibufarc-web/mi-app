import { CategoryManager } from "@/components/category-manager";
import { getCategoriesWithCount } from "@/lib/data-source";

export const metadata = { title: "Categorías" };

export default async function AdminCategoriasPage() {
  const categories = await getCategoriesWithCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
        <p className="mt-1 text-sm text-ink-soft">
          El slug (lo que va en la URL) se genera solo a partir del nombre. El
          orden define cómo aparecen en el menú del catálogo.
        </p>
      </div>

      <CategoryManager categories={categories} />
    </div>
  );
}
