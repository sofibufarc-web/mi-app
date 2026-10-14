/**
 * Completa la marca de cada producto padre a partir de su nombre.
 *
 *   node --env-file=.env.local scripts/marcas-padres.mjs            # solo informa
 *   node --env-file=.env.local scripts/marcas-padres.mjs --aplicar  # escribe
 *
 * Las marcas no vienen en la lista del proveedor, pero se reconocen por el
 * nombre: las líneas de Sinteplast (Recuplast, Brilloplast…), "Bb" = Doble B,
 * "Pinas", "Trimas", y los aerosoles de la casa, que son Kuwait. Sirve para el
 * filtro por marca y el mega-menú. No pisa una marca ya cargada a mano.
 */
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL, { prepare: false });
const APLICAR = process.argv.includes("--aplicar");

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SINTEPLAST =
  /recuplast|brilloplast|satinplast|barniplast|sellaplast|foresta|converplast|proterox|recubrick|recufloor|recublock|recuplast|duralux|duralatex|madeplast|ferroxin|magiplast|sintevial|sintenvial|marplast|acrilplast|fibreplast|brillospray|sinteplast|ton plast|aike|latizador|atlantico|santinplast|pizarron sinteplast/;

function marcaDe(nombre, categoria) {
  const n = sinTildes(nombre);
  if (/\bdoble b\b|\bbb\b/.test(n) && !/doble a/.test(n)) return "Doble B";
  if (SINTEPLAST.test(n)) return "Sinteplast";
  if (/\bpinas\b/.test(n)) return "Pinas";
  if (/trimas|desoximas/.test(n)) return "Trimas";
  if (/\bkwt\b|kuwait/.test(n)) return "Kuwait";
  if (categoria === "Aerosoles" && /^aero/.test(n)) return "Kuwait";
  return null;
}

const filas = await sql`
  select g.id, g.name, g.brand, c.name as categoria
  from public.product_parents g left join public.categories c on c.id = g.category_id`;

const cambios = filas
  .filter((f) => !f.brand)
  .map((f) => ({ id: f.id, nombre: f.name, marca: marcaDe(f.name, f.categoria ?? "") }))
  .filter((f) => f.marca);

const conteo = {};
for (const c of cambios) conteo[c.marca] = (conteo[c.marca] ?? 0) + 1;
console.log(`Padres: ${filas.length} · con marca deducida: ${cambios.length}`, conteo);

if (APLICAR) {
  await sql.begin(async (tx) => {
    for (const c of cambios) await tx`update public.product_parents set brand = ${c.marca} where id = ${c.id}`;
  });
  console.log("Escrito.");
} else {
  console.log("Solo informe. Para escribir: --aplicar");
}
await sql.end();
