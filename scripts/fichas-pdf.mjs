/**
 * Genera la ficha técnica en PDF (diseño de Wiedmer) de cada producto padre que
 * tenga datos técnicos cargados.
 *
 *   node --env-file=.env.local scripts/fichas-pdf.mjs                  # todas las que tengan datos
 *   node --env-file=.env.local scripts/fichas-pdf.mjs --solo brilloplast,ferroxin
 *   node --env-file=.env.local scripts/fichas-pdf.mjs --png            # además deja una imagen de la 1ª página
 *
 * Sale a `fichas-pdf/<slug>.pdf`. Después, `fichas-subir.mjs` las sube a
 * Supabase Storage y las enlaza en la pestaña «Documentos» de la ficha.
 *
 * Usa Playwright (Chromium): se arma una página HTML (`lib/ficha-html.mjs`) y se
 * imprime a PDF. El PDF NO lleva precios: queda en un bucket público.
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import postgres from "postgres";

import { fichaHtml, pieHtml } from "./lib/ficha-html.mjs";

const args = process.argv.slice(2);
const valor = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const SOLO = valor("--solo")?.split(",").map((s) => s.trim());
const PNG = args.includes("--png");
const SALIDA = path.resolve("fichas-pdf");
fs.mkdirSync(SALIDA, { recursive: true });

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

const [tienda] = await sql`select contact, whatsapp_number from public.store_config where id = 1`;
const info = {
  direccion: tienda.contact.address,
  telefono: tienda.contact.phone,
  whatsapp: tienda.whatsapp_number.replace(/^549?/, "").replace(/^(\d{3})(\d{3})(\d+)$/, "$1 $2-$3"),
};

const padres = await sql`
  select g.*, c.name as categoria from public.product_parents g
  left join public.categories c on c.id = g.category_id
  where g.active
    and (jsonb_array_length(coalesce(g.technical->'datos','[]')) > 0 or g.description <> '')
  order by g.name`;

const lista = padres.filter((p) => !SOLO || SOLO.includes(p.slug));
console.log(`Fichas a generar: ${lista.length}`);

const fecha = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
const navegador = await chromium.launch();
let hechas = 0;

for (const p of lista) {
  const variantes = await sql`
    select sku, color, color_hex, size_label, images from public.products
    where parent_id = ${p.id} and active order by color nulls first, sku`;
  const imagen = p.images?.[0] ?? variantes.find((v) => v.images?.[0])?.images[0] ?? null;

  const parent = {
    name: p.name,
    brand: p.brand,
    description: p.description,
    usage: p.usage,
    finish: p.finish,
    technical: p.technical,
  };
  const html = fichaHtml({ parent, variantes, imagen, tienda: { categoria: p.categoria }, fecha });

  const pagina = await navegador.newPage();
  await pagina.setContent(html, { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);

  await pagina.pdf({
    path: path.join(SALIDA, `${p.slug}.pdf`),
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: pieHtml(info),
    margin: { top: "0", bottom: "14mm", left: "0", right: "0" },
  });
  if (PNG) {
    await pagina.setViewportSize({ width: 794, height: 1123 });
    await pagina.screenshot({ path: path.join(SALIDA, `${p.slug}.png`), fullPage: true });
  }
  await pagina.close();
  hechas++;
  if (hechas % 10 === 0) console.log(`  ${hechas}/${lista.length}`);
}

await navegador.close();
await sql.end();
console.log(`Listo: ${hechas} PDF en ${path.relative(process.cwd(), SALIDA)}/`);
