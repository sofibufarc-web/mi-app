/**
 * Sube a Supabase Storage los PDF de `fichas-pdf/` y los enlaza en la pestaña
 * «Documentos» de cada producto como «Ficha técnica Wiedmer».
 *
 *   npm run fichas:subir -- --dry-run    # solo muestra qué haría
 *   npm run fichas:subir                 # sube (pide email y contraseña de un admin)
 *
 * Se sube con el login de un admin de verdad, igual que el panel y los scripts
 * de fotos: no se usa la clave secreta del proyecto. El nombre del archivo lleva
 * la fecha, así una versión nueva no se confunde con la que tenga cacheada el
 * navegador.
 */
import fs from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

import postgres from "postgres";

const DRY = process.argv.includes("--dry-run");
const CARPETA = path.resolve("fichas-pdf");
const BUCKET = "productos";
const ETIQUETA = "Ficha técnica Wiedmer";

const salir = (m) => {
  console.error(m);
  process.exit(1);
};

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

if (!fs.existsSync(CARPETA)) salir("No existe fichas-pdf/. Corré antes: node --env-file=.env.local scripts/fichas-pdf.mjs");
const pdfs = fs.readdirSync(CARPETA).filter((f) => f.endsWith(".pdf"));
if (!pdfs.length) salir("No hay PDF en fichas-pdf/.");

const sql = postgres(process.env.DIRECT_URL, { prepare: false });
const padres = await sql`select id, slug, technical from public.product_parents where slug = any(${pdfs.map((f) => f.replace(/\.pdf$/, ""))})`;
const porSlug = new Map(padres.map((p) => [p.slug, p]));
console.log(`PDF: ${pdfs.length} · con producto en la base: ${padres.length}`);

if (DRY) {
  console.log("Solo informe (--dry-run): no se sube nada.");
  await sql.end();
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) salir("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.");

/* Este prompt no termina en salto de línea: parece colgado pero está esperando. */
console.log("\nPara subir hace falta iniciar sesión como admin.");
const email = await preguntar("Email del admin: ");
const password = await preguntar("Contraseña: ", { oculto: true });

const perfil = await sql`select role, active from public.profiles where lower(email) = lower(${email})`;
if (!perfil.length) salir(`No hay ninguna cuenta con el email ${email}.`);
if (perfil[0].role !== "admin" || !perfil[0].active) salir("Esa cuenta no es un admin activo.");

const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const cuerpo = await r.json();
if (!r.ok) salir(`Supabase rechazó el login: ${cuerpo.error_description ?? cuerpo.msg ?? r.status}`);
const token = cuerpo.access_token;

const sello = new Date().toISOString().slice(0, 10).replace(/-/g, "");
let subidas = 0;
const fallas = [];

for (const archivo of pdfs) {
  const slug = archivo.replace(/\.pdf$/, "");
  const padre = porSlug.get(slug);
  if (!padre) continue;
  const nombre = `fichas/${slug}-${sello}.pdf`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${nombre}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/pdf",
      "Cache-Control": "31536000",
      "x-upsert": "true",
    },
    body: fs.readFileSync(path.join(CARPETA, archivo)),
  });
  if (!res.ok) {
    fallas.push(`${slug}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    continue;
  }
  const publica = `${url}/storage/v1/object/public/${BUCKET}/${nombre}`;
  const documentos = [
    { label: ETIQUETA, url: publica },
    ...((padre.technical?.documentos ?? []).filter((d) => d.label !== ETIQUETA)),
  ];
  await sql`update public.product_parents set technical = ${sql.json({ ...padre.technical, documentos })} where id = ${padre.id}`;
  subidas++;
  if (subidas % 10 === 0) console.log(`  ${subidas}/${padres.length}`);
}

console.log(`\nSubidas y enlazadas: ${subidas}${fallas.length ? ` · fallas: ${fallas.length}` : ""}`);
fallas.slice(0, 5).forEach((f) => console.log("  ✗", f));
await sql.end();
