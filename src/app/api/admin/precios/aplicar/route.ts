import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { updatePriceList } from "@/lib/data-source";

/**
 * POST /api/admin/precios/aplicar
 *
 * Recibe (en JSON) los cambios que el usuario confirmó en la preview y los
 * persiste de una sola pasada.
 *
 * Body esperado:
 * {
 *   "updates":     [{ "sku": "SIN-1020", "price": 92000 }],
 *   "newProducts": [{ "sku": "XX-1", "name": "…", "price": 100, "categoryId": "c-001" }]
 * }
 *
 * Volvemos a validar todo acá: la preview la calculó el servidor, pero el body
 * lo arma el navegador y nunca hay que confiar en lo que manda el cliente.
 */

type Payload = {
  updates?: Array<{ sku?: unknown; price?: unknown }>;
  newProducts?: Array<{
    sku?: unknown;
    name?: unknown;
    price?: unknown;
    categoryId?: unknown;
  }>;
};

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const updates = (payload.updates ?? []).flatMap((row) =>
    typeof row?.sku === "string" && row.sku.trim() !== "" && isValidPrice(row.price)
      ? [{ sku: row.sku.trim(), price: row.price }]
      : [],
  );

  const newProducts = (payload.newProducts ?? []).flatMap((row) =>
    typeof row?.sku === "string" && row.sku.trim() !== "" && isValidPrice(row.price)
      ? [
          {
            sku: row.sku.trim(),
            name:
              typeof row.name === "string" && row.name.trim() !== ""
                ? row.name.trim()
                : row.sku.trim(),
            price: row.price,
            categoryId: typeof row.categoryId === "string" ? row.categoryId : "",
          },
        ]
      : [],
  );

  if (updates.length === 0 && newProducts.length === 0) {
    return NextResponse.json(
      { error: "No hay cambios válidos para aplicar." },
      { status: 400 },
    );
  }

  try {
    const result = await updatePriceList(updates, newProducts);
    // Los precios se ven en toda la tienda, así que refrescamos todo.
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al aplicar la lista de precios:", error);
    return NextResponse.json(
      { error: "No pudimos guardar los cambios." },
      { status: 500 },
    );
  }
}
