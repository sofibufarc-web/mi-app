/**
 * Genera /public/plantilla-precios.xlsx, la plantilla que se descarga desde
 * /admin/precios.
 *
 * Se arma a partir de los productos reales del catálogo para que sirva como
 * ejemplo concreto: el proveedor (o vos) reemplaza la columna `precio` y sube
 * el archivo de vuelta.
 *
 *   node --env-file=.env.local scripts/generar-plantilla.mjs
 *
 * Lee el catálogo de la base, no de un archivo: así la plantilla nunca queda
 * con productos que ya no existen. `--env-file` es de Node y carga .env.local;
 * un script suelto no pasa por Next, que es quien normalmente lo hace.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import * as XLSX from "xlsx";

const root = process.cwd();

if (!process.env.DIRECT_URL) {
  console.error("Falta DIRECT_URL. Corré: node --env-file=.env.local scripts/generar-plantilla.mjs");
  process.exit(1);
}

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

// La categoría se resuelve con un left join: un producto sin categoría tiene
// que salir igual en la plantilla, con la columna vacía.
const products = await sql`
  select p.sku, p.name, p.price, coalesce(c.name, '') as category_name
  from public.products p
  left join public.categories c on c.id = p.category_id
  order by p.id`;

await sql.end();

// Los encabezados van EXACTAMENTE con los nombres que espera el parser.
const rows = products.map((product) => ({
  codigo: product.sku,
  nombre: product.name,
  // price es `numeric` en Postgres y el driver lo entrega como texto para no
  // perder precisión. En la planilla tiene que ser número, si no Excel lo
  // muestra alineado a la izquierda y no deja sumarlo.
  precio: Number(product.price),
  categoria: product.category_name,
}));

const sheet = XLSX.utils.json_to_sheet(rows, {
  header: ["codigo", "nombre", "precio", "categoria"],
});

// Anchos de columna, para que el archivo se lea sin tener que estirar nada.
sheet["!cols"] = [{ wch: 14 }, { wch: 46 }, { wch: 12 }, { wch: 24 }];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Lista de precios");

const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
const out = path.join(root, "public", "plantilla-precios.xlsx");
await writeFile(out, buffer);

console.log(`✓ ${path.relative(root, out)} — ${rows.length} filas`);
