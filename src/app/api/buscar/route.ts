import { NextResponse } from "next/server";

import {
  getCategories,
  getParentBySku,
  getParents,
} from "@/lib/data-source";

/**
 * GET /api/buscar?q=… — resultados del buscador del header mientras se escribe.
 *
 * Es PÚBLICO a propósito (el catálogo lo es), así que NUNCA devuelve precios:
 * ni el campo existe en la respuesta. Busca por nombre, marca o código; si lo
 * escrito es un código exacto, ese producto va primero y con el código ya
 * elegido (`?codigo=…`).
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [exacto, { items }, categorias] = await Promise.all([
    getParentBySku(q),
    getParents({ search: q, limit: 6 }),
    getCategories(),
  ]);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.name]));

  const lista = [...items];
  if (exacto && !lista.some((p) => p.id === exacto.id)) lista.unshift(exacto);

  const results = lista.slice(0, 6).map((p) => {
    const variante = exacto && p.id === exacto.id ? p.variants.find((v) => v.sku.toLowerCase() === q.toLowerCase()) : undefined;
    return {
      name: p.name,
      href: `/producto/${p.slug}${variante ? `?codigo=${encodeURIComponent(variante.sku)}` : ""}`,
      image: p.images[0] ?? p.variants.find((v) => v.images[0])?.images[0] ?? null,
      category: nombreCat.get(p.categoryId) ?? null,
      code: variante?.sku ?? p.variants[0]?.sku ?? null,
      variants: p.variants.length,
    };
  });

  return NextResponse.json({ results });
}
