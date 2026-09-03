import * as XLSX from "xlsx";

import { getCategories, getProducts, getStoreConfig } from "@/lib/data-source";

/**
 * Descarga de la lista de precios del mes, en Excel.
 *
 *     GET /api/lista-precios  →  lista-precios-wiedmer-2026-09.xlsx
 *
 * SOLO PARA CLIENTES CON SESIÓN. Quien lo protege es `src/proxy.ts`, que corta
 * el paso antes de que este archivo se ejecute; acá no hay ningún chequeo
 * porque si el request llegó hasta esta línea, ya pasó por ahí.
 *
 * Es importante que la protección esté en el proxy y no solo en el botón: si
 * únicamente escondiéramos el botón, cualquiera podría escribir la dirección a
 * mano en el navegador y bajarse la lista mayorista completa.
 *
 * El archivo se arma en el momento con los precios actuales. No se guarda en
 * disco a propósito: una lista guardada envejece en silencio y termina siendo
 * el motivo de una discusión con un cliente que facturó con precios viejos.
 */

// Nunca cachear: cada descarga tiene que traer los precios de HOY.
export const dynamic = "force-dynamic";

/** "2026-09" — sirve para nombrar el archivo y para que ordene solo en una carpeta. */
function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const [products, categories, config] = await Promise.all([
    // Solo los activos: los ocultos del catálogo tampoco se cotizan.
    getProducts({ onlyActive: true, sort: "nombre" }),
    getCategories(),
    getStoreConfig(),
  ]);

  const nombreCategoria = new Map(categories.map((c) => [c.id, c.name]));

  const filas = products.map((product) => ({
    codigo: product.sku,
    nombre: product.name,
    marca: product.brand ?? "",
    presentacion: product.unit ?? "",
    categoria: nombreCategoria.get(product.categoryId) ?? "",
    precio: product.price,
  }));

  const hoja = XLSX.utils.json_to_sheet(filas, {
    header: ["codigo", "nombre", "marca", "presentacion", "categoria", "precio"],
  });

  // Anchos de columna, para que se lea sin tener que estirar nada al abrirlo.
  hoja["!cols"] = [
    { wch: 14 }, // codigo
    { wch: 46 }, // nombre
    { wch: 18 }, // marca
    { wch: 16 }, // presentacion
    { wch: 24 }, // categoria
    { wch: 14 }, // precio
  ];

  // Congela la primera fila: al scrollear una lista larga, los encabezados
  // quedan siempre a la vista.
  hoja["!freeze"] = { xSplit: "0", ySplit: "1" };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Lista de precios");

  const buffer: Buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

  const archivo = `lista-precios-${config.storeName.toLowerCase()}-${periodoActual()}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // `attachment` hace que el navegador lo BAJE en vez de intentar abrirlo.
      // Sin esto, algunos navegadores muestran caracteres raros en pantalla.
      "Content-Disposition": `attachment; filename="${archivo}"`,
      // Que no quede una copia vieja en el caché del navegador ni de la CDN.
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
