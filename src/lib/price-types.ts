/**
 * Tipos de la previsualización de la lista de precios.
 *
 * Viven separados de `src/lib/excel.ts` a propósito: ese archivo tiene
 * `import "server-only"` y la UI del panel (que corre en el navegador) necesita
 * estos tipos para pintar las tablas. Al estar acá, cliente y servidor comparten
 * la misma definición sin que el cliente arrastre código de servidor.
 */

export type PriceRowUpdate = {
  productId: string;
  sku: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  /** Variación porcentual, ya redondeada. Ej: 12.5 */
  deltaPercent: number;
};

export type PriceRowNew = {
  sku: string;
  name: string;
  price: number;
  /** Categoría deducida de la columna `categoria` del Excel; "" si no matcheó. */
  categoryId: string;
  categoryName: string;
};

export type PriceRowError = {
  /** Número de fila tal como se ve en Excel. */
  row: number;
  sku: string;
  reason: string;
};

export type PricePreview = {
  fileName: string;
  sheetName: string;
  headerRow: number;
  dataRows: number;
  toUpdate: PriceRowUpdate[];
  unchanged: Array<{ sku: string; name: string; price: number }>;
  newItems: PriceRowNew[];
  errors: PriceRowError[];
  /** Productos del catálogo que el archivo no menciona. No se tocan. */
  missingInFile: Array<{ sku: string; name: string; price: number }>;
};
