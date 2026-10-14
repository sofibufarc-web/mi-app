import Link from "next/link";

import { firstParam } from "@/components/catalog-filters";
import { getCategories, getParentsForAdmin } from "@/lib/data-source";
import { normalizeText } from "@/lib/slug";

export const metadata = { title: "Fichas técnicas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminFichasPage({ searchParams }: Props) {
  const query = await searchParams;
  const q = normalizeText(firstParam(query.q) ?? "");
  const [padres, categorias] = await Promise.all([getParentsForAdmin(), getCategories()]);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.name]));
  const lista = padres.filter((p) => !q || normalizeText(p.name).includes(q));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fichas técnicas</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Cada producto agrupa sus colores y tamaños. La ficha técnica se carga una sola vez y vale para todas las
          variantes. Solo la ven los clientes con sesión.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={firstParam(query.q) ?? ""}
          placeholder="Buscar producto…"
          className="h-10 w-full max-w-sm rounded-md border border-line bg-card px-3 text-sm"
        />
        <button className="btn-primary h-10 text-sm">Buscar</button>
      </form>

      <p className="text-sm text-ink-soft">{lista.length} productos</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2 text-right">Variantes</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.slice(0, 200).map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-ink-soft">{nombreCat.get(p.categoryId) ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{p.variants}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/fichas/${p.id}`} className="font-semibold text-brand hover:underline">
                    Editar ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > 200 && <p className="text-xs text-ink-soft">Mostrando 200: afiná la búsqueda para ver el resto.</p>}
    </div>
  );
}
