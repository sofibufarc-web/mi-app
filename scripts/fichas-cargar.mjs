/**
 * Carga en la base los datos técnicos REALES que juntaron los agentes.
 *
 *   node --env-file=.env.local scripts/fichas-cargar.mjs salida-sinteplast.json [otros.json…]   # solo informa
 *   node --env-file=.env.local scripts/fichas-cargar.mjs salida-*.json --aplicar
 *   … --incluir-dudosas     # además de las de confianza "alta"
 *
 * Cada archivo es un array con un objeto por producto padre (ver el formato en
 * el pedido a los agentes: parentId, confianza, descripcion, uso, terminacion,
 * datos, pasos, documentos, fuentes).
 *
 * Reglas:
 *  - Solo entran las de confianza "alta" (o "dudosa" con --incluir-dudosas).
 *  - No se pisa una descripción que ya esté cargada a mano.
 *  - "Presentaciones" y "Colores" del fabricante se descartan: la ficha muestra
 *    las presentaciones y códigos de Wiedmer, que son lo que se vende.
 *  - La carpeta técnica existente conserva lo que no se carga acá
 *    (complementarios y el PDF de Wiedmer).
 */
import fs from "node:fs";

import postgres from "postgres";

const args = process.argv.slice(2);
const APLICAR = args.includes("--aplicar");
const DUDOSAS = args.includes("--incluir-dudosas");
const archivos = args.filter((a) => !a.startsWith("--"));
if (!archivos.length) {
  console.error("Pasá al menos un archivo salida-*.json");
  process.exit(1);
}

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

const DESCARTAR = new Set(["presentaciones", "colores", "color", "presentacion", "contenido", "contenido neto"]);
const USOS = new Set(["interior", "exterior", "ambos"]);
const limpiar = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const entradas = archivos.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const admitidas = entradas.filter((e) => e.confianza === "alta" || (DUDOSAS && e.confianza === "dudosa"));
console.log(`Entradas: ${entradas.length} · admitidas: ${admitidas.length} (alta${DUDOSAS ? " + dudosa" : ""})`);

const existentes = await sql`select id, name, description, technical from public.product_parents where id = any(${admitidas.map((e) => e.parentId)})`;
const porId = new Map(existentes.map((p) => [p.id, p]));

const cambios = [];
for (const e of admitidas) {
  const padre = porId.get(e.parentId);
  if (!padre) {
    console.warn(`  ✗ ${e.parentId}: no existe en la base`);
    continue;
  }
  const datos = (e.datos ?? [])
    .map((d) => ({ label: limpiar(d.label, 60), value: limpiar(d.value, 500) }))
    .filter((d) => d.label && d.value && !DESCARTAR.has(d.label.toLowerCase()));
  const pasos = (e.pasos ?? []).map((p) => limpiar(p, 900)).filter(Boolean);
  // Si hay pasos numerados, el dato «Modo de uso» sería lo mismo repetido.
  if (pasos.length) {
    for (let i = datos.length - 1; i >= 0; i--) if (/^modo de uso$/i.test(datos[i].label)) datos.splice(i, 1);
  }
  const docs = (e.documentos ?? [])
    .filter((d) => /^https:\/\//i.test(d?.url ?? ""))
    .map((d) => ({ label: /^ficha t[eé]cnica$/i.test(d.label ?? "") ? "Ficha técnica del fabricante" : limpiar(d.label, 80) || "Documento del fabricante", url: d.url }));
  const descripcion = limpiar(e.descripcion, 700);
  if (!datos.length && !pasos.length && !descripcion) continue;

  const previo = padre.technical ?? {};
  const documentos = [
    ...(previo.documentos ?? []).filter((d) => !docs.some((n) => n.url === d.url)),
    ...docs,
  ];
  cambios.push({
    id: padre.id,
    nombre: padre.name,
    descripcion: padre.description ? padre.description : descripcion,
    usage: USOS.has(e.uso) ? e.uso : null,
    finish: limpiar(e.terminacion, 40) || null,
    technical: {
      ...previo,
      datos,
      uso: pasos,
      documentos,
      fuentes: [...new Set((e.fuentes ?? []).filter((u) => /^https?:\/\//i.test(u)))],
    },
    cuantos: { datos: datos.length, pasos: pasos.length, docs: docs.length },
  });
}

const suma = (k) => cambios.reduce((a, c) => a + c.cuantos[k], 0);
console.log(`A cargar: ${cambios.length} productos · ${suma("datos")} datos · ${suma("pasos")} pasos · ${suma("docs")} documentos`);
for (const c of cambios.slice(0, 8)) console.log(`  · ${c.nombre}: ${c.cuantos.datos} datos, ${c.cuantos.pasos} pasos, ${c.cuantos.docs} docs`);

if (!APLICAR) {
  console.log("\nSolo informe. Para escribir: --aplicar");
} else {
  await sql.begin(async (tx) => {
    for (const c of cambios) {
      await tx`
        update public.product_parents set
          description = ${c.descripcion},
          usage = coalesce(${c.usage}, usage),
          finish = coalesce(${c.finish}, finish),
          technical = ${tx.json(c.technical)}
        where id = ${c.id}`;
    }
  });
  console.log("\nEscrito en la base.");
}
await sql.end();
