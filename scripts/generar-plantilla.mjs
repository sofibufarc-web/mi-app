/**
 * Genera /public/plantilla-precios.xlsx, la plantilla que se descarga desde
 * /admin/precios.
 *
 * Se arma a partir de los productos reales del catálogo para que sirva como
 * ejemplo concreto: el proveedor (o vos) reemplaza la columna `precio` y sube
 * el archivo de vuelta.
 *
 *   node scripts/generar-plantilla.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const root = process.cwd();

const products = JSON.parse(
  await readFile(path.join(root, "src", "data", "products.json"), "utf8"),
);
const categories = JSON.parse(
  await readFile(path.join(root, "src", "data", "categories.json"), "utf8"),
);

const categoryName = new Map(categories.map((c) => [c.id, c.name]));

// Los encabezados van EXACTAMENTE con los nombres que espera el parser.
const rows = products.map((product) => ({
  codigo: product.sku,
  nombre: product.name,
  precio: product.price,
  categoria: categoryName.get(product.categoryId) ?? "",
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
