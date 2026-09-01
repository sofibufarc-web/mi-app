import "server-only";

import * as XLSX from "xlsx";

import type { Category, Product } from "@/data/types";
import { parsePriceValue } from "@/lib/price-parse";
import type {
  PricePreview,
  PriceRowError,
  PriceRowNew,
  PriceRowUpdate,
} from "@/lib/price-types";
import { normalizeText } from "@/lib/slug";

/**
 * Parseo del Excel de lista de precios y armado de la previsualización.
 *
 * Se usa SheetJS (paquete `xlsx`), que lee .xlsx, .xls y .csv con la misma API.
 *
 * Este módulo NO escribe nada: solo lee el archivo, lo compara contra el
 * catálogo y devuelve un informe. Escribir es responsabilidad de
 * `updatePriceList()` en la capa de datos, y solo después de que el usuario
 * confirme.
 */

/* -------------------------------------------------------------------------- */
/* Detección de columnas                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Sinónimos aceptados para cada columna. Los headers se normalizan antes de
 * comparar (minúsculas, sin tildes, sin espacios ni guiones), así que
 * "Código", "CODIGO" y "cod. artículo" caen todos en la misma bolsa.
 */
const COLUMN_SYNONYMS = {
  codigo: [
    "codigo",
    "cod",
    "codart",
    "codarticulo",
    "codigoarticulo",
    "sku",
    "articulo",
    "art",
    "referencia",
  ],
  precio: [
    "precio",
    "preciounitario",
    "preciolista",
    "plista",
    "importe",
    "valor",
    "precioventa",
    "prventa",
  ],
  nombre: ["nombre", "descripcion", "detalle", "producto", "articulodescripcion"],
  categoria: ["categoria", "rubro", "familia", "linea"],
} as const;

type ColumnKey = keyof typeof COLUMN_SYNONYMS;

/** "Cód. Artículo" → "codarticulo" */
function normalizeHeader(value: unknown): string {
  return normalizeText(String(value ?? "")).replace(/[^a-z0-9]/g, "");
}

/** Devuelve el índice de columna de cada campo, o -1 si no está. */
function detectColumns(headerRow: unknown[]): Record<ColumnKey, number> {
  const normalized = headerRow.map(normalizeHeader);
  const result = { codigo: -1, precio: -1, nombre: -1, categoria: -1 };

  for (const key of Object.keys(COLUMN_SYNONYMS) as ColumnKey[]) {
    const synonyms: readonly string[] = COLUMN_SYNONYMS[key];
    // Primero buscamos coincidencia exacta; si no hay, aceptamos que el header
    // empiece con el sinónimo ("preciolista2026").
    let index = normalized.findIndex((h) => h !== "" && synonyms.includes(h));
    if (index === -1) {
      index = normalized.findIndex(
        (h) => h !== "" && synonyms.some((s) => h.startsWith(s)),
      );
    }
    result[key] = index;
  }

  return result;
}

/**
 * Busca la fila de encabezados. No siempre es la primera: muchos listados
 * traen el logo o el título del proveedor arriba. Miramos las primeras 10
 * filas y nos quedamos con la primera que tenga código Y precio.
 */
function findHeaderRow(rows: unknown[][]): {
  index: number;
  columns: Record<ColumnKey, number>;
} | null {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const columns = detectColumns(rows[i] ?? []);
    if (columns.codigo !== -1 && columns.precio !== -1) {
      return { index: i, columns };
    }
  }
  return null;
}

/** Error "esperable" del parseo: se le muestra tal cual al usuario. */
export class PriceListError extends Error {}

/* -------------------------------------------------------------------------- */
/* Parseo                                                                      */
/* -------------------------------------------------------------------------- */

export function buildPricePreview(params: {
  buffer: Buffer;
  fileName: string;
  products: Product[];
  categories: Category[];
}): PricePreview {
  const { buffer, fileName, products, categories } = params;

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new PriceListError(
      "No pudimos abrir el archivo. Revisá que sea un .xlsx, .xls o .csv válido.",
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new PriceListError("El archivo no tiene ninguna hoja.");
  }

  // `header: 1` devuelve filas como arrays, en vez de objetos. Así podemos
  // buscar nosotros la fila de encabezados y reportar números de fila reales.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (rows.length === 0) {
    throw new PriceListError("La hoja está vacía.");
  }

  const header = findHeaderRow(rows);
  if (!header) {
    throw new PriceListError(
      'No encontramos las columnas obligatorias. El archivo tiene que tener una columna de código (o "sku") y otra de precio.',
    );
  }

  const { index: headerIndex, columns } = header;

  // Índices para buscar rápido, con las claves ya normalizadas.
  const productBySku = new Map(products.map((p) => [normalizeText(p.sku), p]));
  const categoryByName = new Map<string, Category>();
  for (const category of categories) {
    categoryByName.set(normalizeText(category.name), category);
    categoryByName.set(normalizeText(category.slug), category);
  }

  const toUpdate: PriceRowUpdate[] = [];
  const unchanged: PricePreview["unchanged"] = [];
  const newItems: PriceRowNew[] = [];
  const errors: PriceRowError[] = [];

  /** SKUs vistos en el archivo, para detectar duplicados y calcular faltantes. */
  const seenSkus = new Set<string>();
  let dataRows = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    // Número de fila como lo ve el usuario en Excel (empieza en 1).
    const rowNumber = i + 1;

    const sku = String(row[columns.codigo] ?? "").trim();
    const rawPrice = row[columns.precio];
    const name =
      columns.nombre !== -1 ? String(row[columns.nombre] ?? "").trim() : "";

    // Fila totalmente vacía: la salteamos sin avisar (es normal al final).
    if (sku === "" && String(rawPrice ?? "").trim() === "" && name === "") {
      continue;
    }

    dataRows++;

    if (sku === "") {
      errors.push({ row: rowNumber, sku: "", reason: "Fila sin código." });
      continue;
    }

    const key = normalizeText(sku);

    if (seenSkus.has(key)) {
      errors.push({
        row: rowNumber,
        sku,
        reason: "Código repetido dentro del archivo.",
      });
      continue;
    }
    seenSkus.add(key);

    const price = parsePriceValue(rawPrice);
    if (price === null) {
      errors.push({
        row: rowNumber,
        sku,
        reason: `Precio inválido: "${String(rawPrice ?? "")}".`,
      });
      continue;
    }

    const product = productBySku.get(key);

    if (!product) {
      const rawCategory =
        columns.categoria !== -1 ? String(row[columns.categoria] ?? "").trim() : "";
      const category = rawCategory
        ? categoryByName.get(normalizeText(rawCategory))
        : undefined;

      newItems.push({
        sku,
        name: name || sku,
        price,
        categoryId: category?.id ?? "",
        categoryName: category?.name ?? (rawCategory || "Sin categoría"),
      });
      continue;
    }

    if (product.price === price) {
      unchanged.push({ sku: product.sku, name: product.name, price });
      continue;
    }

    toUpdate.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      oldPrice: product.price,
      newPrice: price,
      deltaPercent: product.price
        ? Math.round(((price - product.price) / product.price) * 1000) / 10
        : 0,
    });
  }

  const missingInFile = products
    .filter((p) => !seenSkus.has(normalizeText(p.sku)))
    .map((p) => ({ sku: p.sku, name: p.name, price: p.price }));

  return {
    fileName,
    sheetName,
    headerRow: headerIndex + 1,
    dataRows,
    toUpdate,
    unchanged,
    newItems,
    errors,
    missingInFile,
  };
}
