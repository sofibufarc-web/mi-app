/**
 * Carga inicial del catálogo real, desde el Excel armado con la lista del
 * proveedor.
 *
 *   node --env-file=.env.local scripts/importar-lista.mjs [archivo.xlsx] --dry-run
 *   node --env-file=.env.local scripts/importar-lista.mjs [archivo.xlsx]
 *
 * Con `--dry-run` no toca la base: imprime cuántos productos quedarían en cada
 * categoría y cuáles no clasificó. Es la pasada que conviene mirar primero.
 *
 * Sin `--dry-run` hace, todo adentro de UNA transacción:
 *   1. respalda los productos actuales a un JSON,
 *   2. los borra,
 *   3. se asegura de que existan las categorías nuevas,
 *   4. inserta los del Excel.
 *
 * Entra entero o no entra: una carga a medias dejaría el catálogo en un estado
 * que nadie sabría desde dónde retomar.
 *
 * Usa DIRECT_URL, igual que las migraciones y el resto de los scripts.
 */
import * as fs from "node:fs";
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import * as XLSX from "xlsx";

/* SheetJS no toma el `fs` de Node solo cuando se lo importa como módulo ESM:
   hay que dárselo a mano o `readFile` no encuentra ningún archivo. */
XLSX.set_fs(fs);

const args = process.argv.slice(2);
const SECO = args.includes("--dry-run");
const ARCHIVO = args.find((a) => !a.startsWith("--")) ?? "lista-precios-2026-05-28.xlsx";
/* Cuántos sin clasificar listar en la pasada en seco. Sirve para afinar las
   reglas: MOSTRAR=400 los imprime casi todos. */
const MOSTRAR = Number(process.env.MOSTRAR ?? 30);
const RESPALDO = process.env.RESPALDO ?? "respaldo-productos-anteriores.json";

/* -------------------------------------------------------------------------- */
/* Limpieza de nombres                                                        */
/* -------------------------------------------------------------------------- */

/* Palabras que quedan en minúscula salvo que abran el nombre. */
const MINUSCULAS = new Set(["de", "del", "con", "sin", "para", "por", "y", "a", "el", "la", "en"]);

/* Unidades: van en minúscula. Se compara sin el punto final. */
const UNIDADES = new Set(["lt", "lts", "l", "kg", "gr", "g", "cm", "mm", "mt", "mts", "m", "ml", "cc", "x", "cm3"]);

/**
 * Los símbolos de fracción NO son cosméticos: `slugify` borra todo lo que no
 * sea letra o número, así que "X ¼ LT." y "X ½ LT." producen el mismo slug y la
 * segunda variante termina con una URL tipo "...-lt-2". Escribiéndolas como
 * 1/4 y 1/2 los dígitos sobreviven y cada tamaño tiene su dirección.
 */
function normalizarFracciones(texto) {
  return texto
    .replace(/¼/g, " 1/4 ")
    .replace(/½/g, " 1/2 ")
    .replace(/¾/g, " 3/4 ");
}

/**
 * Las comillas \`\`así'' son un artefacto de la extracción del PDF. Vienen
 * pegadas a la palabra de al lado ("frentista\`pinas'12"), así que además de
 * normalizarlas hay que separarlas: si no, el token queda con número adentro y
 * el paso siguiente lo trata como si fuera una medida.
 */
function normalizarComillas(texto) {
  return texto.replace(/``|''|[`']/g, '"').replace(/"/g, ' " ');
}

/**
 * MAYÚSCULA SOSTENIDA → Mayúscula Inicial.
 *
 * Los tokens que llevan números se dejan intactos: ahí vive el tamaño, que es
 * lo único que distingue una variante de otra ("10 CM." de "18 CM."), y no hay
 * nada que ganar tocándolo.
 */
function aMayusculaInicial(nombre) {
  const tokens = nombre.split(" ");
  return tokens
    .map((token, i) => {
      if (/\d/.test(token)) return token.toLowerCase();
      const desnudo = token.replace(/[.,]+$/, "").toLowerCase();
      if (UNIDADES.has(desnudo)) return token.toLowerCase();
      if (i > 0 && MINUSCULAS.has(desnudo)) return token.toLowerCase();
      // Mayúscula al principio de cada tramo de letras, así "SINT.COLOR"
      // queda "Sint.Color" y no "Sint.color".
      return token
        .toLowerCase()
        .replace(/(^|[^a-záéíóúüñ])([a-záéíóúüñ])/g, (_, antes, letra) => antes + letra.toUpperCase());
    })
    .join(" ");
}

function limpiarNombre(crudo) {
  const texto = aMayusculaInicial(normalizarComillas(normalizarFracciones(crudo)));
  return texto.split(/\s+/).filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Categorías                                                                 */
/* -------------------------------------------------------------------------- */

/* Las dos que no existen todavía. Se crean si hacen falta. */
const CATEGORIAS_NUEVAS = [
  { name: "Cintas y Adhesivos", slug: "cintas-y-adhesivos" },
  { name: "Ferretería y Herramientas", slug: "ferreteria-y-herramientas" },
];

/**
 * Reglas de clasificación, en orden: gana la PRIMERA que coincide.
 *
 * Se clasifica por el nombre y no por el rango de código porque el rango no
 * agrupa nada: el 1400 mezcla tacos de madera con protectores para madera, y
 * 489 artículos tienen código de 5 dígitos sin orden temático.
 */
const REGLAS = [
  // Los aerosoles van primero: un "Aero Convert.Oxido x 240 cm3" es antes un
  // aerosol que un convertidor. El envase manda sobre el contenido.
  ["Aerosoles", /AEROSOL|SPRAY|\bAERO\b|\d{3} ?CM3|405 ML/],
  ["Rodillos y Pinceles", /RODILLO|PINCEL|BROCHA|CERDA|REPUESTO LANA|REPUESTO TECNOROL|REPUESTO ANTIGOTA|REPUESTO \d|SOPORTE ROD|BANDEJA|EXTENSOR|ROLO|TECNOROL|MANGO|PINTA REJAS|REJA ESCURRIDORA/],
  ["Lijado y Espatulado", /LIJA|ESPATULA|MASILLA|ENDUIDO|LLANA|FRATACHO|ESMERIL|RASQUETA|\bDISCO\b|VIRUTA|ESTOPA/],
  ["Impermeabilizantes", /IMPERMEAB|MEMBRANA|ASFALT|TECHADO|HIDROFUGO|SELLADOR|CERESITA|OXIFLEX|VELO DE VIDRIO|MANTA |VENDA |KIT PARCHE|RECUBLOCK/],
  ["Cintas y Adhesivos", /CINTA|PEGAMENTO|ADHESIVO|SILICONA|CARTUCHO|COLA VINIL|POXI|CEMENTO DE CONTACTO/],
  ["Limpieza y Protección", /TRAPO|FRANELA|REJILLA|PAÑO|LAMPAZO|SECADOR|ESCOBA|DETERGENTE|JABON|LIMPIA|GUANTE|BARBIJO|ANTIPARRA|MAMELUCO|MASCARILLA|ARNES/],
  ["Ferretería y Herramientas", /CEPILLO|COBERTURA|TACO|MAQUINA|PISTOLA|BALDE|ESCALERA|CUCHILL|TIJERA|MARTILL|DESTORNILL|REGLA|METRO|BOLSA|ESCUADRA|CUCHARA|CUCHARIN|ESCARIADOR|ABRELATAS|ARGOLLA|PEINE FRENTISTA|CARTON ROLLO|MANTEL/],
  ["Pinturas", /LATEX|ESMALTE|BARNIZ|SINTETIC|CONVERT|ANTIOXIDO|LACA|DILU|THINNER|AGUARRAS|PINTURA|PLAST|ACRILIC|FORESTA|PROTECTOR|FONDO|IMPRIMACION|TINTA|COLORANTE|PIGMENTO|HIDROESMALTE|PROTEROX|SINTEVIAL|RECUFLOOR|RECUMIX|RECUBRICK|DECK|REMOVEDOR|DESOXIMAS|ALTA T|ENTONADOR|MANO PREVIA|PIZARRON|DURALUX|PRIMER |DOBLE ACCION/],
  // Último recurso: en un distribuidor de pinturería, lo que se vende por
  // litro y no cayó en ninguna regla anterior es pintura.
  ["Pinturas", /X ?\d+([./]\d+)? ?(LTS?|L)\b/],
];

function clasificar(nombreCrudo) {
  const regla = REGLAS.find(([, patron]) => patron.test(nombreCrudo));
  return regla ? regla[0] : null;
}

/* -------------------------------------------------------------------------- */
/* Slug: la misma receta que src/lib/slug.ts                                  */
/* -------------------------------------------------------------------------- */
/* Está repetida y no importada porque este archivo es .mjs y aquel es .ts: un
   script suelto de Node no compila TypeScript. Es la misma concesión que ya
   hace crear-usuario.mjs con el hash de contraseñas. */

function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugUnico(texto, usados) {
  const base = slugify(texto) || "item";
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/* -------------------------------------------------------------------------- */
/* Lectura del Excel                                                          */
/* -------------------------------------------------------------------------- */

function leerExcel(ruta) {
  const libro = XLSX.readFile(ruta);
  // La primera hoja, igual que hace el panel (src/lib/excel.ts).
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

  return filas
    .map((fila) => ({
      sku: String(fila.codigo ?? "").trim(),
      nombreCrudo: String(fila.nombre ?? "").trim(),
      precio: Number(fila.precio),
    }))
    .filter((fila) => fila.sku && fila.nombreCrudo && Number.isFinite(fila.precio) && fila.precio > 0);
}

/* -------------------------------------------------------------------------- */

async function main() {
  const crudas = leerExcel(ARCHIVO);
  console.log(`Excel: ${ARCHIVO} → ${crudas.length} artículos con precio`);

  const usados = new Set();
  const productos = crudas.map((fila) => {
    const name = limpiarNombre(fila.nombreCrudo);
    const slug = slugUnico(name, usados);
    usados.add(slug);
    return { ...fila, name, slug, categoria: clasificar(fila.nombreCrudo) };
  });

  // Resumen por categoría.
  const conteo = new Map();
  for (const p of productos) conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1);
  console.log("\nReparto por categoría:");
  for (const [cat, n] of [...conteo].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${cat ?? "(sin categoría)"}`);
  }

  const huerfanos = productos.filter((p) => !p.categoria);
  if (huerfanos.length > 0) {
    console.log(`\nSin clasificar (${huerfanos.length}), primeros ${MOSTRAR}:`);
    for (const p of huerfanos.slice(0, MOSTRAR)) console.log(`   ${p.sku}  ${p.name}`);
  }

  // Slugs que hubo que desempatar: son los que conviene mirar a ojo.
  const desempatados = productos.filter((p) => /-\d+$/.test(p.slug) && !/\d/.test(p.name.slice(-3)));
  if (desempatados.length > 0) {
    console.log(`\nSlugs desempatados (${desempatados.length}):`);
    for (const p of desempatados) console.log(`   ${p.sku}  ${p.name}  →  ${p.slug}`);
  }

  if (SECO) {
    console.log("\n--dry-run: no se escribió nada en la base.");
    return;
  }

  const sql = postgres(process.env.DIRECT_URL);
  try {
    const anteriores = await sql`select * from public.products order by id`;
    writeFileSync(RESPALDO, JSON.stringify(anteriores, null, 2));
    console.log(`\nRespaldo: ${anteriores.length} productos → ${RESPALDO}`);

    const resultado = await sql.begin(async (tx) => {
      // 1. Categorías nuevas. `on conflict (slug) do nothing` la hace repetible:
      //    correr el script dos veces no duplica nada.
      const [{ max }] = await tx`select coalesce(max(sort_order), 0) as max from public.categories`;
      let orden = Number(max);
      for (const cat of CATEGORIAS_NUEVAS) {
        orden += 1;
        await tx`
          insert into public.categories (name, slug, image, sort_order)
          values (${cat.name}, ${cat.slug}, ${`/img/categorias/${cat.slug}.svg`}, ${orden})
          on conflict (slug) do nothing`;
      }

      const categorias = await tx`select id, name from public.categories`;
      const idPorNombre = new Map(categorias.map((c) => [c.name, c.id]));

      // 2. Fuera el catálogo anterior.
      const borrados = await tx`delete from public.products returning id`;

      // La secuencia vuelve a empezar: si no, una segunda corrida arrancaría en
      // p-1231 sobre una tabla vacía. `alter sequence` es transaccional (a
      // diferencia de `setval`), así que si algo falla más abajo también se
      // deshace.
      await tx`alter sequence public.products_id_seq restart with 1`;

      // 3. Adentro el nuevo.
      const filas = productos.map((p) => ({
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        // El precio viaja como texto para que Postgres lo lea como `numeric`
        // exacto y no como un decimal aproximado.
        price: String(p.precio),
        category_id: p.categoria ? (idPorNombre.get(p.categoria) ?? null) : null,
        // Activos: sin esto el catálogo público se vería vacío. Llegan sin foto
        // ni descripción, que es lo que se completa después desde el panel.
        active: true,
      }));

      const insertados = await tx`
        insert into public.products ${tx(filas, "sku", "name", "slug", "price", "category_id", "active")}
        returning id`;

      return { borrados: borrados.length, insertados: insertados.length };
    });

    console.log(`Borrados: ${resultado.borrados}  ·  Insertados: ${resultado.insertados}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
