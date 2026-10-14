/**
 * Agrupa los artículos existentes en "producto padre + variantes".
 *
 *   node --env-file=.env.local scripts/agrupar-variantes.mjs             # solo informa
 *   node --env-file=.env.local scripts/agrupar-variantes.mjs --aplicar   # escribe en la base
 *
 * Cada fila de `products` ya es una variante (tiene su código, precio y
 * stock). Acá se deduce, a partir del NOMBRE, a qué padre pertenece y cuál es
 * su color y su tamaño: "Amarillo Sintetico Bb x 1/2" →
 *   padre  "Esmalte Sintético Doble B"
 *   color  "Amarillo"
 *   tamaño "1/2 lt"
 *
 * Es una heurística: los nombres vienen abreviados por el proveedor. Por eso
 * SIEMPRE deja un Excel (`equivalencias-variantes.xlsx`) con una fila por
 * código, ordenado por padre, para revisarlo. Los casos dudosos van marcados
 * en la columna `revisar`.
 *
 * Es idempotente: con --aplicar borra los padres que armó una corrida anterior
 * y los rehace. Los datos que se carguen a mano en un padre (carpeta técnica,
 * descripción, fotos) se conservan si el padre sigue existiendo con el mismo
 * slug.
 */
import fs from "node:fs";
import postgres from "postgres";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const APLICAR = process.argv.includes("--aplicar");
const url = process.env.DIRECT_URL;
if (!url) {
  console.error("Falta DIRECT_URL. ¿Corriste el script con --env-file=.env.local?");
  process.exit(1);
}
const sql = postgres(url, { prepare: false });

/* -------------------------------------------------------------------------- */
/* Utilidades de texto                                                         */
/* -------------------------------------------------------------------------- */

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => sinTildes(s).toLowerCase();
const slugify = (s) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Colores conocidos con un hex aproximado para las muestras circulares. */
const COLORES = {
  "Blanco Mate": "#f4f4f2",
  "Blanco Satinado": "#f1f1ef",
  "Blanco Brillante": "#f7f7f5",
  Blanco: "#f7f7f5",
  "Negro Mate": "#1c1c1c",
  "Negro Satinado": "#1e1e1e",
  Negro: "#111111",
  "Azul Marino": "#14284b",
  "Azul Traful": "#2f6db5",
  "Azul Trazul": "#2f6db5",
  Azulejo: "#3b8fcf",
  Azul: "#1e4fa3",
  Celeste: "#8fc7ea",
  "Amarillo Mediano": "#f2c200",
  "Amarillo Vial": "#ffd400",
  "Amarillo Fluo": "#e8ff00",
  Amarillo: "#f9d71c",
  Naranja: "#f07a13",
  "Rojo Vivo": "#d62828",
  "Rojo Teja": "#a8412d",
  Rojo: "#c8102e",
  "Bermellon O": "#d9381e",
  Bermellon: "#d9381e",
  Rosado: "#f4a3c0",
  Magenta: "#c2185b",
  Violeta: "#6d3a9c",
  "Verde Ingles": "#1f5a3a",
  "Verde Noche": "#12372a",
  "Verde Claro": "#7bc47f",
  "Verde Cemento": "#8c9a86",
  Verde: "#2e8b57",
  "Gris Espacial": "#7d8186",
  "Gris Perla": "#c9ccd1",
  "Gris Oscuro": "#4b4f55",
  "Gris Hielo": "#dde2e6",
  Gris: "#9a9fa5",
  Aluminio: "#b8bcc2",
  Alumino: "#b8bcc2",
  Plata: "#c0c0c0",
  Oro: "#c9a227",
  Cobre: "#b87333",
  Cromado: "#d4d6d8",
  Marfil: "#efe6cc",
  "Marfil Champ": "#e4d8b8",
  "Marfil Seda": "#efe4c8",
  Crema: "#f1e5bf",
  Beige: "#d9c7a0",
  "Marron Africano": "#5a3a22",
  "Marron Tinaja": "#7a4a2b",
  "Marron Tabaco": "#6a4528",
  Marron: "#6b4423",
  Castaño: "#6e4a2e",
  Cedro: "#a0592f",
  Caoba: "#6f2f1e",
  Nogal: "#5b3a24",
  Roble: "#b88a54",
  Wenge: "#3b2a22",
  Natural: "#c8a26b",
  Incoloro: "#f2eee4",
  Ocre: "#c68e17",
  Traful: "#2f6db5",
};
// Los más largos primero, para que "Azul Marino" gane sobre "Azul".
const NOMBRES_COLOR = Object.keys(COLORES).sort((a, b) => b.length - a.length);

/** Categorías donde el color es una dimensión de la variante. */
const CATEGORIAS_CON_COLOR = new Set(["Pinturas", "Aerosoles"]);

/** Abreviaturas del proveedor → texto legible, para el nombre del padre. */
const EXPANSIONES = [
  [/\bsint\.?(?=\W|$)/gi, "Sintético"],
  [/\bsintetico\b/gi, "Sintético"],
  [/\bbb\b/gi, "Doble B"],
  [/\bbco\.?(?=\W|$)/gi, "Blanco"],
  [/\bngo?\.?(?=\W|$)/gi, "Negro"],
  [/\bint\.?(?=\W|$)/gi, "Interior"],
  [/\bext\.?(?=\W|$)/gi, "Exterior"],
  [/\bbrill\.?(?=\W|$)/gi, "Brillante"],
  [/\bsatin\.?(?=\W|$)/gi, "Satinado"],
  [/\bantioxido\b/gi, "Antióxido"],
  [/\bconvert\.?(?=\W|$)/gi, "Convertidor"],
  [/\bde ox\.?(?=\W|$)/gi, "de Óxido"],
  [/\bprofes\.?(?=\W|$)/gi, "Profesional"],
  [/\balumin\.?(?=\W|$)/gi, "Aluminio"],
  [/\bimperm\.?(?=\W|$)/gi, "Impermeabilizante"],
  [/\bp\//gi, "para "],
];

/* -------------------------------------------------------------------------- */
/* Interpretar un nombre                                                       */
/* -------------------------------------------------------------------------- */

const UNIDADES = "lts?|lt|l|kgs?|kg|k|grs?|gr|g|cm3|cm|ml|mts?|mt|m|un|u";
const NUM = String.raw`\d+(?:[.,]\d+)?(?:/\d+)?`;

/** Texto del tamaño normalizado: "1/4 lt", "20 kg", "240 cm3", "10x50". */
function normalizarUnidad(u) {
  if (!u) return "";
  const x = u.toLowerCase().replace(/\.$/, "");
  if (/^l(ts?)?$/.test(x)) return "lt";
  if (/^kgs?$|^k$/.test(x)) return "kg";
  if (/^grs?$|^g$/.test(x)) return "gr";
  if (/^mts?$|^m$/.test(x)) return "m";
  return x;
}

/**
 * Separa el tamaño del final del nombre.
 * Devuelve { resto, size } o null si el nombre no termina en una medida.
 */
function extraerTamano(nombre, categoria) {
  let texto = nombre.trim().replace(/\s+/g, " ");
  // Paréntesis finales tipo "(Suelto)" o "Bidon" no son parte del tamaño.
  texto = texto.replace(/\s*\((?:suelto)\)\s*$/i, "");

  // 1) Dimensiones: "10x50", "0.90 x 25 m", "25 x 0.10 m."
  let m = texto.match(
    new RegExp(String.raw`^(.*?)[\s-]*(${NUM}(?:\s*x\s*${NUM})+)\s*(${UNIDADES})?\.?\s*$`, "i"),
  );
  if (m && m[1].trim()) {
    const dim = m[2].replace(/\s+/g, "");
    return { resto: m[1], size: `${dim}${m[3] ? " " + normalizarUnidad(m[3]) : ""}` };
  }

  // 2) "x 1/2 lt", "x 20 lt", "- 1 l.", "4 lt", "x1lt"
  m = texto.match(
    new RegExp(String.raw`^(.*?)[\s-]*(?:x\s*)?(${NUM})\s*(${UNIDADES})?\.?\s*$`, "i"),
  );
  if (m && m[1].trim()) {
    const numero = m[2].replace(",", ".");
    let unidad = normalizarUnidad(m[3]);
    // Sin unidad: en pinturas y diluyentes los tamaños comunes son litros.
    if (!unidad && ["Pinturas", "Diluyentes y removedores", "Impermeabilizantes"].includes(categoria)) {
      if (["1/4", "1/2", "1", "4", "5", "10", "18", "20"].includes(numero)) unidad = "lt";
    }
    return { resto: m[1], size: unidad ? `${numero} ${unidad}` : numero };
  }

  return null;
}

/** "Converplast-Conv.De ox-1 L.Bco": el color queda DESPUÉS del tamaño. */
function extraerTamanoIntermedio(nombre) {
  const m = nombre.match(new RegExp(String.raw`^(.*?)[\s-]*(${NUM})\s*(${UNIDADES})\.?\s*(.+)$`, "i"));
  if (!m || !m[1].trim() || !m[4].trim()) return null;
  return { resto: `${m[1]} ${m[4]}`, size: `${m[2]} ${normalizarUnidad(m[3])}` };
}

function extraerColor(texto) {
  const t = norm(texto);
  for (const color of NOMBRES_COLOR) {
    const c = norm(color);
    const re = new RegExp(String.raw`(^|[^a-z0-9])(${c})(?=[^a-z0-9]|$)`);
    const hit = re.exec(t);
    if (hit) {
      const inicio = hit.index + hit[1].length;
      const quitado = texto.slice(0, inicio) + " " + texto.slice(inicio + c.length);
      return { color, resto: quitado };
    }
  }
  return null;
}

function embellecer(base) {
  let s = base
    .replace(/[-_]+/g, " ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, por] of EXPANSIONES) s = s.replace(re, por);
  s = s
    .replace(/^[\s.\-,]+/, "") // puntuación suelta al principio
    .replace(/\s+x$/i, "") // "Proterox Antióxido x" → "Proterox Antióxido"
    .replace(/\.\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  // Título: primera letra de cada palabra en mayúscula, el resto como viene.
  s = s
    .split(" ")
    .map((w) => (w.length > 2 && w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return s;
}

function interpretar(p, categoria) {
  const avisos = [];
  let resto = p.name;
  let size = "";
  let color = "";

  const t = extraerTamano(resto, categoria);
  if (t) {
    resto = t.resto;
    size = t.size;
  } else {
    const t2 = extraerTamanoIntermedio(resto);
    if (t2) {
      resto = t2.resto;
      size = t2.size;
    } else {
      avisos.push("sin tamaño");
    }
  }

  if (CATEGORIAS_CON_COLOR.has(categoria)) {
    const c = extraerColor(resto);
    if (c) {
      color = c.color;
      resto = c.resto;
    }
  }

  let base = embellecer(resto);

  // Los esmaltes de Doble B arrancan con el color: lo que queda es
  // "Sintético Doble B". El padre real se llama "Esmalte Sintético ...".
  if (/^sint[eé]tico\b/i.test(base) && categoria === "Pinturas") base = `Esmalte ${base}`;
  if (/^Mediano Sintético/i.test(base)) base = base.replace(/^Mediano /i, "Esmalte ");

  if (base.length < 3) {
    avisos.push("nombre base vacío");
    base = embellecer(p.name);
    size = "";
    color = "";
  }

  return { base, color, size, avisos };
}

/* -------------------------------------------------------------------------- */
/* Armado de grupos                                                            */
/* -------------------------------------------------------------------------- */

const productos = await sql`
  select p.id, p.sku, p.name, p.brand, p.images, p.active, c.id as category_id, c.name as categoria
  from public.products p
  left join public.categories c on c.id = p.category_id
  order by c.name nulls last, p.name`;

console.log(`Productos: ${productos.length}`);

const grupos = new Map(); // clave -> { nombre, categoryId, categoria, items: [] }
for (const p of productos) {
  const categoria = p.categoria ?? "";
  const r = interpretar(p, categoria);
  const clave = `${p.category_id ?? "-"}|${norm(r.base)}`;
  if (!grupos.has(clave)) {
    grupos.set(clave, { nombre: r.base, categoryId: p.category_id, categoria, items: [] });
  }
  grupos.get(clave).items.push({ p, ...r });
}

// Dos variantes con el mismo color y tamaño dentro de un grupo no pueden
// convivir (el segundo es otro artículo con nombre parecido): la segunda sale
// a un grupo propio, marcada para revisar.
for (const [clave, g] of [...grupos]) {
  const vistos = new Set();
  const sueltos = [];
  g.items = g.items.filter((it) => {
    const k = `${it.color}|${it.size}`;
    if (vistos.has(k)) {
      sueltos.push(it);
      return false;
    }
    vistos.add(k);
    return true;
  });
  for (const it of sueltos) {
    it.avisos.push("duplicado de color+tamaño");
    grupos.set(`${clave}#${it.p.sku}`, {
      nombre: it.p.name,
      categoryId: g.categoryId,
      categoria: g.categoria,
      items: [{ ...it, color: "", size: "" }],
    });
  }
}

// Slugs únicos para los padres.
const slugsUsados = new Set();
for (const g of grupos.values()) {
  let slug = slugify(g.nombre) || "producto";
  let n = 2;
  const base = slug;
  while (slugsUsados.has(slug)) slug = `${base}-${n++}`;
  slugsUsados.add(slug);
  g.slug = slug;
}

/* -------------------------------------------------------------------------- */
/* Informe                                                                     */
/* -------------------------------------------------------------------------- */

const lista = [...grupos.values()].sort(
  (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre),
);
const conVariantes = lista.filter((g) => g.items.length > 1).length;
console.log(`Padres: ${lista.length} (${conVariantes} con más de una variante)`);
const porCat = {};
for (const g of lista) porCat[g.categoria || "(sin categoría)"] = (porCat[g.categoria || "(sin categoría)"] ?? 0) + 1;
console.log("Padres por categoría:", porCat);

const filas = [];
for (const g of lista) {
  for (const it of g.items) {
    const revisar = [...it.avisos];
    if (g.items.length === 1) revisar.push("sin hermanos");
    filas.push({
      codigo: it.p.sku,
      nombre_actual: it.p.name,
      categoria: g.categoria,
      producto_padre: g.nombre,
      color: it.color,
      tamano: it.size,
      variantes_del_padre: g.items.length,
      revisar: revisar.filter((x) => x !== "sin hermanos").join(", "),
    });
  }
}
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), "equivalencias");
XLSX.writeFile(libro, "equivalencias-variantes.xlsx");
console.log("Excel de revisión: equivalencias-variantes.xlsx");
console.log(
  "Con aviso para revisar:",
  filas.filter((f) => f.revisar).length,
  "· ejemplo de grupos grandes:",
  lista
    .filter((g) => g.items.length > 8)
    .slice(0, 6)
    .map((g) => `${g.nombre} (${g.items.length})`)
    .join("; "),
);

if (!APLICAR) {
  console.log("\nSolo informe. Para escribir en la base: --aplicar");
  await sql.end();
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* Escritura (una sola transacción)                                            */
/* -------------------------------------------------------------------------- */

// Respaldo mínimo: el estado previo de las tres columnas nuevas.
fs.mkdirSync("respaldos", { recursive: true });
const previo = await sql`select id, parent_id, color, color_hex, size_label from public.products`;
try {
  // "wx": no pisa un respaldo del mismo día (puede ser el estado original).
  fs.writeFileSync(
    `respaldos/products-variantes-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(previo),
    { flag: "wx" },
  );
} catch {
  /* ya existía uno de hoy: se conserva */
}

await sql.begin(async (tx) => {
  // Conservar lo cargado a mano en padres que ya existían.
  const existentes = await tx`select slug, brand, description, usage, finish, images, technical from public.product_parents`;
  const porSlug = new Map(existentes.map((e) => [e.slug, e]));

  await tx`update public.products set parent_id = null, color = null, color_hex = null, size_label = null`;
  await tx`delete from public.product_parents`;

  for (const g of lista) {
    const ant = porSlug.get(g.slug);
    // La marca y las fotos del padre salen de sus variantes.
    const marcas = g.items.map((i) => i.p.brand).filter(Boolean);
    const marca = marcas[0] ?? null;
    const fotos = g.items.map((i) => i.p.images?.[0]).filter(Boolean);
    const portada = ant?.images?.length ? ant.images : fotos.length ? [fotos[0]] : [];

    const [padre] = await tx`
      insert into public.product_parents (name, slug, brand, category_id, description, usage, finish, images, technical)
      values (${g.nombre}, ${g.slug}, ${ant?.brand ?? marca}, ${g.categoryId}, ${ant?.description ?? ""},
              ${ant?.usage ?? null}, ${ant?.finish ?? null}, ${portada}, ${ant?.technical ?? {}})
      returning id`;
    for (const it of g.items) {
      await tx`
        update public.products
        set parent_id = ${padre.id},
            color = ${it.color || null},
            color_hex = ${it.color ? COLORES[it.color] : null},
            size_label = ${it.size || null}
        where id = ${it.p.id}`;
    }
  }
});

console.log("\nListo: padres y variantes escritos en la base.");
await sql.end();
