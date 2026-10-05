/**
 * Carga de fotos en lote, para los productos que no tienen ninguna.
 *
 *   npm run lote:plantilla              # genera fotos-lote.xlsx con los productos sin foto
 *   npm run lote:aplicar -- --dry-run   # procesa las fotos y deja copias para mirar, NO sube
 *   npm run lote:aplicar                # sube y anota (pide email y contraseña de un admin)
 *
 * El flujo:
 *  1. `plantilla` escribe un Excel con una fila por producto sin foto, agrupadas
 *     por artículo (el mismo esmalte en doce colores queda junto).
 *  2. Ponés las fotos en `imagenes/fotos-nuevas/` (cualquier tamaño o fondo).
 *  3. En la columna `archivo` escribís el nombre de la foto de cada producto. Si
 *     varios productos comparten la misma, repetís el nombre.
 *  4. `aplicar` unifica cada foto (fondo blanco, 1000 x 1000, mismo margen, ver
 *     unificar-fotos.mjs), la sube UNA vez a Storage y la anota en todos los
 *     productos que la nombran.
 *
 * Por defecto sólo toca productos que NO tienen foto, así que no puede pisar
 * nada. Con `--pisar` también reemplaza fotos existentes, y entonces guarda antes
 * un respaldo en `respaldos/`.
 *
 * Se sube con el login de un admin de verdad, igual que el panel y los demás
 * scripts de fotos: no se usa la clave secreta del proyecto.
 */
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import * as XLSX from "xlsx";

import { unificar } from "./unificar-fotos.mjs";

/* La versión ESM de la librería de Excel no trae el módulo de archivos de Node:
   sin esto, leer o guardar falla con "Cannot access file". */
XLSX.set_fs(fs);

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = path.join(raiz, "imagenes", "fotos-nuevas");
const PREVIA = path.join(raiz, "imagenes", "fotos-lote-previa");
const EXCEL = path.join(raiz, "fotos-lote.xlsx");
const RESPALDOS = path.join(raiz, "respaldos");
const BUCKET = "productos";
const EXTENSIONES = [".jpg", ".jpeg", ".png", ".webp"];

const args = process.argv.slice(2);
const PASO = args.find((a) => !a.startsWith("--"));
const SECO = args.includes("--dry-run");
const PISAR = args.includes("--pisar");

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

const aSlug = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/* -------------------------------------------------------------------------- */
/* Paso 1: la plantilla                                                        */
/* -------------------------------------------------------------------------- */

/** "Aluminio Sintetico Bb x 1/2" -> "Aluminio Sintetico Bb": saca el tamaño del final. */
function nombreBase(nombre) {
  return nombre
    .replace(/\s*x\s*[\d.,/]+\s*(lt|lts|l|cm3|grs?|kg|kgs|m|mts|u)?\.?\s*$/i, "")
    .replace(/\s+[\d.,/]+\s*(lt|lts|cm3|grs?|kg|mts?|cm|mm)?\.?$/i, "")
    .trim();
}

async function plantilla() {
  const sql = postgres(process.env.DIRECT_URL, { prepare: false });
  const filas = await sql`
    select p.id, p.sku, p.name, coalesce(c.name, '(sin categoría)') as categoria
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.active and cardinality(p.images) = 0
    order by categoria, p.name`;
  await sql.end();

  const hoja = XLSX.utils.json_to_sheet(
    filas.map((f) => ({
      grupo: nombreBase(f.name),
      codigo: f.sku,
      producto: f.name,
      categoria: f.categoria,
      id: f.id,
      archivo: "", // <- lo completa una persona
    })),
  );
  hoja["!cols"] = [{ wch: 34 }, { wch: 10 }, { wch: 46 }, { wch: 26 }, { wch: 9 }, { wch: 28 }];

  const leeme = XLSX.utils.aoa_to_sheet([
    ["Cómo completar"],
    ["1. Poné las fotos en imagenes/fotos-nuevas/ (jpg, png o webp; las HEIC del iPhone hay que pasarlas a JPG)."],
    ["2. En la columna `archivo` de la hoja `productos`, escribí el nombre de la foto de cada artículo."],
    ["3. Si varios artículos usan la misma foto, repetí el nombre. La foto se sube una sola vez."],
    ["4. Las filas con `archivo` vacío se ignoran. Podés completar de a poco y volver a correr."],
    ["5. No cambies la columna `id`: es la que dice a qué producto va cada foto."],
  ]);
  leeme["!cols"] = [{ wch: 110 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "productos");
  XLSX.utils.book_append_sheet(libro, leeme, "leeme");
  XLSX.writeFile(libro, EXCEL);
  fs.mkdirSync(CARPETA, { recursive: true });

  const grupos = new Set(filas.map((f) => nombreBase(f.name)));
  console.log(`\n${path.basename(EXCEL)}: ${filas.length} productos sin foto, en ${grupos.size} grupos.`);
  console.log(`Las fotos van en: ${path.relative(raiz, CARPETA)}/`);
}

/* -------------------------------------------------------------------------- */
/* Paso 2: unificar, subir y anotar                                            */
/* -------------------------------------------------------------------------- */

/** Busca el archivo ignorando mayúsculas y aceptando que falte la extensión. */
function buscarArchivo(nombre) {
  const existentes = fs.existsSync(CARPETA) ? fs.readdirSync(CARPETA) : [];
  const pedido = nombre.trim().toLowerCase();
  const exacto = existentes.find((f) => f.toLowerCase() === pedido);
  if (exacto) return exacto;
  return existentes.find((f) => EXTENSIONES.some((e) => f.toLowerCase() === pedido + e));
}

async function preguntar(pregunta, { oculto = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const escribir = process.stdout.write.bind(process.stdout);
  let silenciar = false;
  if (oculto) process.stdout.write = (c, ...r) => (silenciar ? true : escribir(c, ...r));
  escribir(pregunta);
  silenciar = oculto;
  const respuesta = await new Promise((resolve) => rl.question("", resolve));
  silenciar = false;
  if (oculto) {
    process.stdout.write = escribir;
    escribir("\n");
  }
  rl.close();
  return respuesta.trim();
}

async function entrarComoAdmin(sql) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) salir("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.");

  /* Este prompt no termina en salto de línea: el cursor queda pegado a los dos
     puntos. Es normal, está esperando que escribas. */
  console.log("\nPara subir hace falta iniciar sesión como admin.");
  const email = await preguntar("Email del admin: ");
  const password = await preguntar("Contraseña: ", { oculto: true });

  const perfil = await sql`select role, active from public.profiles where lower(email) = lower(${email})`;
  if (!perfil.length) salir(`No hay ninguna cuenta con el email ${email}.`);
  if (perfil[0].role !== "admin" || !perfil[0].active) {
    salir("Esa cuenta no es un admin activo: Storage le va a rechazar las subidas.");
  }
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cuerpo = await r.json();
  if (!r.ok) salir(`Supabase rechazó el login: ${cuerpo.error_description ?? cuerpo.msg ?? r.status}`);
  return { url, key, token: cuerpo.access_token };
}

async function subir({ url, key, token }, nombreArchivo, webp) {
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${nombreArchivo}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/webp",
      "Cache-Control": "31536000",
    },
    body: webp,
  });
  if (!r.ok) throw new Error(`Storage rechazó la subida (${r.status}): ${(await r.text()).slice(0, 200)}`);
  return `${url}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
}

async function aplicar() {
  if (!fs.existsSync(EXCEL)) salir(`Falta ${path.basename(EXCEL)}. Corré primero: npm run lote:plantilla`);

  const libro = XLSX.read(fs.readFileSync(EXCEL));
  const filas = XLSX.utils.sheet_to_json(libro.Sheets["productos"] ?? {});
  const pedidas = filas.filter((f) => String(f.archivo ?? "").trim());
  if (!pedidas.length) salir("No hay ninguna fila con la columna `archivo` completa.");

  /* Cada nombre se resuelve a un archivo real; los que no existen se reportan
     todos juntos, para corregir el Excel de una vez y no de a uno. */
  const resueltos = new Map(); // nombre pedido -> archivo en disco
  const faltan = new Set();
  for (const f of pedidas) {
    const pedido = String(f.archivo).trim();
    if (resueltos.has(pedido) || faltan.has(pedido)) continue;
    const real = buscarArchivo(pedido);
    if (real) resueltos.set(pedido, real);
    else faltan.add(pedido);
  }
  if (faltan.size) {
    console.warn(`\n${faltan.size} archivos nombrados en el Excel no están en ${path.relative(raiz, CARPETA)}/:`);
    [...faltan].slice(0, 15).forEach((n) => console.warn(`  ✗ ${n}`));
  }

  const sql = postgres(process.env.DIRECT_URL, { prepare: false });

  /* Sólo se tocan productos que existen y (salvo --pisar) no tienen foto. */
  const ids = pedidas.map((f) => String(f.id));
  const actuales = await sql`select id, images from public.products where id = any(${ids})`;
  const porId = new Map(actuales.map((p) => [p.id, p]));

  const trabajo = [];
  const omitidos = { sinProducto: 0, yaTieneFoto: 0 };
  for (const f of pedidas) {
    const real = resueltos.get(String(f.archivo).trim());
    if (!real) continue;
    const producto = porId.get(String(f.id));
    if (!producto) { omitidos.sinProducto++; continue; }
    if (producto.images.length && !PISAR) { omitidos.yaTieneFoto++; continue; }
    trabajo.push({ id: String(f.id), producto: f.producto, archivo: real, antes: producto });
  }
  if (omitidos.sinProducto) console.warn(`\n${omitidos.sinProducto} filas con un id que no existe: se ignoran.`);
  if (omitidos.yaTieneFoto) console.warn(`${omitidos.yaTieneFoto} filas de productos que ya tienen foto: se ignoran (usá --pisar para reemplazarlas).`);
  if (!trabajo.length) { await sql.end(); salir("No quedó ninguna fila aplicable."); }

  const archivos = [...new Set(trabajo.map((t) => t.archivo))];
  console.log(`\n${trabajo.length} productos, ${archivos.length} fotos distintas.`);

  /* Unificar cada foto una vez. Si una falla (por ejemplo un HEIC) no frena al
     resto: queda en la lista de fallidas. */
  fs.mkdirSync(PREVIA, { recursive: true });
  const listas = new Map(); // archivo -> webp
  const fallidas = [];
  for (const archivo of archivos) {
    try {
      const { final, chica } = await unificar(path.join(CARPETA, archivo));
      listas.set(archivo, final);
      fs.writeFileSync(path.join(PREVIA, `${path.parse(archivo).name}.webp`), final);
      console.log(`  ${archivo}${chica ? "   (foto chica: se va a ver algo blanda)" : ""}`);
    } catch (e) {
      const heic = /heic|heif/i.test(path.extname(archivo)) || /unsupported image format/i.test(e.message);
      fallidas.push(archivo);
      console.warn(`  ✗ ${archivo}: ${heic ? "formato no soportado (si es HEIC del iPhone, pasala a JPG)" : e.message}`);
    }
  }
  console.log(`\nCopias para mirar antes de subir: ${path.relative(raiz, PREVIA)}/`);

  if (SECO) {
    console.log("\n(--dry-run: no se subió nada ni se tocó la base)");
    await sql.end();
    return;
  }

  if (PISAR) {
    fs.mkdirSync(RESPALDOS, { recursive: true });
    const r = path.join(RESPALDOS, `lote-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(r, JSON.stringify(trabajo.map((t) => t.antes), null, 2));
    console.log(`Respaldo de las fotos que se reemplazan: ${path.relative(raiz, r)}`);
  }

  const sesion = await entrarComoAdmin(sql);
  const direcciones = new Map();
  for (const [archivo, webp] of listas) {
    const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      direcciones.set(archivo, await subir(sesion, `lote-${aSlug(path.parse(archivo).name)}-${sufijo}.webp`, webp));
    } catch (e) {
      console.warn(`  ✗ ${archivo}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  /* Anotar en una transacción: o quedan todos o ninguno. */
  const aEscribir = trabajo.filter((t) => direcciones.has(t.archivo));
  await sql.begin(async (tx) => {
    for (const t of aEscribir) {
      await tx`update public.products set images = ${[direcciones.get(t.archivo)]}::text[] where id = ${t.id}`;
    }
  });
  await sql.end();

  console.log(`\nListo: ${direcciones.size} fotos subidas, ${aEscribir.length} productos actualizados.`);
  if (fallidas.length || faltan.size) console.log(`Quedaron pendientes ${fallidas.length + faltan.size} archivos (ver arriba).`);
}

/* -------------------------------------------------------------------------- */

const pasos = { plantilla, aplicar };
if (!pasos[PASO]) {
  salir(
    "Uso: node scripts/fotos-lote.mjs <paso>\n\n" +
      "  plantilla   escribe fotos-lote.xlsx con los productos sin foto\n" +
      "  aplicar     unifica, sube y anota las fotos del Excel (--dry-run para ver qué haría)\n\n" +
      "  --pisar     también reemplaza fotos que ya existen (guarda respaldo)",
  );
}
await pasos[PASO]();
