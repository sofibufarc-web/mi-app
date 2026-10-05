/**
 * Unifica TODAS las fotos que hoy usan los productos (las de Sinteplast, Kuwait
 * y el sitio viejo) y reapunta cada producto a la versión nueva.
 *
 *   npm run fotos:unificar -- --dry-run   # baja y procesa, NO sube ni escribe en la base
 *   npm run fotos:unificar                # sube y reapunta (pide email y contraseña de un admin)
 *   ... -- --desde-respaldo               # rehace partiendo de las fotos ORIGINALES del respaldo
 *
 * `--desde-respaldo` sirve para repetir el proceso con otros ajustes sin
 * procesar dos veces: si se partiera de las fotos ya unificadas se estaría
 * agrandando una foto que ya se agrandó.
 *
 * Qué hace, en orden:
 *  1. Lee `products.images` y junta las direcciones DISTINTAS del bucket
 *     `productos` (una foto la comparten muchos artículos: se procesa una vez).
 *  2. RESPALDO: guarda id + images de cada producto en `respaldos/`. Si algo
 *     sale mal, ese archivo tiene la dirección vieja de cada artículo.
 *  3. Baja cada foto y le aplica `unificar()` (ver unificar-fotos.mjs).
 *  4. Sube la versión nueva con un nombre nuevo. No pisa la vieja: el archivo
 *     original sigue en Storage, así que volver atrás es solo volver a escribir
 *     las direcciones del respaldo.
 *  5. Reapunta los productos en una transacción: o cambian todos o ninguno.
 *
 * Mismo camino de subida que el panel y que fotos-sitio.mjs: se inicia sesión
 * como admin de verdad, no se usa la clave secreta del proyecto.
 */
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import { unificar } from "./unificar-fotos.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "productos";
const SECO = process.argv.includes("--dry-run");
const DESDE_RESPALDO = process.argv.includes("--desde-respaldo");
const LOCAL = path.join(raiz, "imagenes", "fotos-unificadas-storage");
const RESPALDOS = path.join(raiz, "respaldos");

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

/** Pide algo por teclado; con `oculto` no muestra lo que se tipea (ver fotos-sitio.mjs). */
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

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

/* Normal: se parte de lo que hay hoy en la base. Con --desde-respaldo: de las
   direcciones ORIGINALES del respaldo más viejo, pero sólo para los productos que
   siguen apuntando a una foto unificada (los que se cambiaron a mano no se tocan). */
let productos;
if (DESDE_RESPALDO) {
  const viejo = fs.readdirSync(RESPALDOS).filter((f) => f.endsWith(".json")).sort()[0];
  if (!viejo) salir("No hay ningún respaldo en respaldos/.");
  console.log(`Partiendo de los originales de ${viejo}`);
  const original = JSON.parse(fs.readFileSync(path.join(RESPALDOS, viejo), "utf8"));
  const hoy = await sql`select id, images from public.products where cardinality(images) > 0`;
  const sigue = new Set(hoy.filter((p) => p.images[0].includes("/productos/u-")).map((p) => p.id));
  productos = original.filter((p) => sigue.has(p.id));
} else {
  productos = await sql`select id, images from public.products where cardinality(images) > 0`;
}
const prefijo = `/storage/v1/object/public/${BUCKET}/`;
const esDelBucket = (u) => typeof u === "string" && u.includes(prefijo);

const distintas = [...new Set(productos.flatMap((p) => p.images).filter(esDelBucket))];
const ajenas = new Set(productos.flatMap((p) => p.images).filter((u) => !esDelBucket(u)));
console.log(`${productos.length} productos con foto · ${distintas.length} fotos distintas en Storage`);
if (ajenas.size) console.log(`(${ajenas.size} direcciones fuera del bucket: no se tocan)`);

/* 2. Respaldo, antes de cualquier cosa que escriba. */
fs.mkdirSync(RESPALDOS, { recursive: true });
const archivoRespaldo = path.join(RESPALDOS, `products-images-${new Date().toISOString().slice(0, 10)}.json`);
if (!fs.existsSync(archivoRespaldo)) {
  /* Si ya existe uno de hoy NO se pisa: puede ser el estado original, previo a una
     corrida anterior de este mismo script. */
  fs.writeFileSync(archivoRespaldo, JSON.stringify(productos, null, 2));
}
console.log(`Respaldo: ${path.relative(raiz, archivoRespaldo)}`);

/* 3. Bajar y unificar. */
fs.mkdirSync(LOCAL, { recursive: true });
const nuevas = new Map(); // dirección vieja -> { webp, chica }
const fallidas = [];
for (const [i, direccion] of distintas.entries()) {
  try {
    const r = await fetch(direccion);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const original = Buffer.from(await r.arrayBuffer());
    const { final, chica } = await unificar(original);
    nuevas.set(direccion, { webp: final, chica });
    fs.writeFileSync(path.join(LOCAL, `${String(i).padStart(4, "0")}-${path.basename(direccion)}`), final);
  } catch (e) {
    fallidas.push({ direccion, motivo: e.message });
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${distintas.length}`);
}
const chicas = [...nuevas.entries()].filter(([, v]) => v.chica).map(([d]) => path.basename(d));
console.log(`\nProcesadas: ${nuevas.size} · fallidas: ${fallidas.length} · chicas (pixeladas): ${chicas.length}`);
fallidas.slice(0, 10).forEach((f) => console.log(`  ✗ ${path.basename(f.direccion)}: ${f.motivo}`));
if (chicas.length) fs.writeFileSync(path.join(LOCAL, "_fotos-chicas.txt"), chicas.join("\n"));
console.log(`Copias locales para mirar: ${path.relative(raiz, LOCAL)}/`);

if (SECO) {
  console.log("\n(--dry-run: no se subió nada ni se tocó la base)");
  await sql.end();
  process.exit(0);
}

/* 4. Subir. */
const sesion = await entrarComoAdmin(sql);
const reemplazo = new Map(); // dirección vieja -> dirección nueva
for (const [direccion, { webp }] of nuevas) {
  const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const base = path.basename(direccion).replace(/\.\w+$/, "").replace(/-[a-z0-9]+-[a-z0-9]{6}$/, "");
  try {
    reemplazo.set(direccion, await subir(sesion, `u-${base}-${sufijo}.webp`, webp));
  } catch (e) {
    console.warn(`  ✗ ${base}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
console.log(`\nSubidas: ${reemplazo.size} de ${nuevas.size}`);

/* 5. Reapuntar en una transacción. Un producto se actualiza solo si TODAS sus
      fotos del bucket se pudieron reemplazar; si no, queda como estaba. */
let tocados = 0;
await sql.begin(async (tx) => {
  for (const p of productos) {
    const propias = p.images.filter(esDelBucket);
    if (!propias.length || !propias.every((u) => reemplazo.has(u))) continue;
    const imagenes = p.images.map((u) => reemplazo.get(u) ?? u);
    await tx`update public.products set images = ${imagenes}::text[] where id = ${p.id}`;
    tocados++;
  }
});
await sql.end();
console.log(`Listo: ${tocados} productos reapuntados.`);
console.log(`Para volver atrás: las direcciones viejas están en ${path.relative(raiz, archivoRespaldo)}.`);
