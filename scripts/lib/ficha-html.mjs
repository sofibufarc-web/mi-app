/**
 * HTML de la ficha técnica de Wiedmer (se convierte a PDF con Playwright).
 *
 * Diseño propio de Wiedmer: banda azul con el isotipo, título en Archivo,
 * acento naranja, datos en grilla y códigos en JetBrains Mono. NO lleva
 * precios: el PDF queda en un bucket público y los precios son solo para
 * clientes con sesión.
 */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Mismo isotipo que src/components/wiedmer-logo.tsx (viewBox 120×104). */
const W_POINTS = "22.7,28 38,28 49.4,61.9 60,47.8 70.6,61.9 82,28 97.4,28 81.2,76 65.9,76 60,68.2 54.2,76 38.9,76";
const MARCA = `<svg viewBox="0 0 120 104" fill="none" class="mark"><rect x="11" y="11" width="98" height="82" rx="11" stroke="currentColor" stroke-width="7"/><polygon points="${W_POINTS}" fill="currentColor"/></svg>`;

function valorTamano(t) {
  const m = String(t ?? "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?/);
  if (!m) return 0;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

/** Matriz color × tamaño con el código en cada celda (compacta aunque haya 130 variantes). */
function tablaCodigos(variantes) {
  const tamanos = [...new Set(variantes.map((v) => v.size_label ?? ""))].sort((a, b) => valorTamano(a) - valorTamano(b));
  const colores = [...new Set(variantes.map((v) => v.color ?? ""))];
  const celda = new Map(variantes.map((v) => [`${v.color ?? ""}|${v.size_label ?? ""}`, v.sku]));
  const hex = new Map(variantes.map((v) => [v.color ?? "", v.color_hex]));
  const conColor = colores.some(Boolean);

  const cab = `<tr>${conColor ? "<th>Color</th>" : ""}${tamanos.map((t) => `<th class="c">${esc(t || "Código")}</th>`).join("")}</tr>`;
  const filas = colores
    .map((c) => {
      const swatch = c ? `<span class="sw" style="background:${esc(hex.get(c) ?? "#cccccc")}"></span>${esc(c)}` : "";
      return `<tr>${conColor ? `<td class="col">${swatch}</td>` : ""}${tamanos
        .map((t) => `<td class="c cod">${esc(celda.get(`${c}|${t}`) ?? "·")}</td>`)
        .join("")}</tr>`;
    })
    .join("");
  return `<table class="codigos"><thead>${cab}</thead><tbody>${filas}</tbody></table>`;
}

const USO = { interior: "Interior", exterior: "Exterior", ambos: "Interior y exterior" };

export function fichaHtml({ parent, variantes, imagen, tienda, fecha }) {
  const t = parent.technical ?? {};
  const datos = (t.datos ?? []).filter((d) => d?.label && d?.value);
  const pasos = (t.uso ?? []).filter(Boolean);
  const chips = [
    parent.usage ? USO[parent.usage] : null,
    parent.finish ? `Terminación ${parent.finish.toLowerCase()}` : null,
  ].filter(Boolean);
  const tamanos = [...new Set(variantes.map((v) => v.size_label).filter(Boolean))].sort((a, b) => valorTamano(a) - valorTamano(b));
  const fuentes = (t.fuentes ?? []).map((u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } }).filter(Boolean);
  const origen = [...new Set(fuentes)];

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@500;600&family=Libre+Franklin:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  :root { --brand:#1e3a8a; --dark:#07184d; --accent:#f97316; --ink:#1f2937; --soft:#5a6475; --line:#e5e7eb; --surface:#f1f3f6; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Libre Franklin", system-ui, sans-serif; color: var(--ink); font-size: 9.6pt; line-height: 1.45; }
  .banda { background: var(--dark); color: #fff; padding: 9mm 14mm 7mm; display: flex; align-items: center; justify-content: space-between; }
  .logo { display: flex; align-items: center; gap: 3mm; }
  .mark { height: 9mm; width: auto; }
  .logo b { font-family: Archivo, sans-serif; font-weight: 800; font-size: 17pt; letter-spacing: -0.01em; }
  .tag { font-family: Archivo, sans-serif; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.28em; color: var(--accent); text-align: right; }
  .tag small { display: block; color: #aab6d6; letter-spacing: 0.12em; font-weight: 600; font-size: 7pt; margin-top: 1mm; }
  .cuerpo { padding: 9mm 14mm 4mm; }
  .marcachip { display: inline-block; background: var(--brand); color: #fff; font-family: Archivo, sans-serif; font-weight: 700; font-size: 7.5pt; letter-spacing: 0.16em; text-transform: uppercase; padding: 1mm 3mm; border-radius: 1.5mm; }
  .cat { font-size: 8pt; color: var(--soft); margin-left: 2mm; text-transform: uppercase; letter-spacing: 0.1em; }
  h1 { font-family: Archivo, sans-serif; font-weight: 800; font-size: 27pt; line-height: 1.03; letter-spacing: -0.02em; text-transform: uppercase; color: var(--dark); margin-top: 3mm; }
  .regla { width: 22mm; height: 1.2mm; background: var(--accent); margin: 4mm 0 5mm; border-radius: 1mm; }
  .dos { display: grid; grid-template-columns: 1fr 58mm; gap: 8mm; align-items: start; }
  .desc { font-size: 10.2pt; line-height: 1.55; color: var(--ink); }
  .chips { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 4mm; }
  .chip { border: 0.3mm solid var(--line); background: var(--surface); border-radius: 5mm; padding: 1mm 3.2mm; font-size: 8pt; font-weight: 600; color: var(--brand); }
  .foto { background: var(--surface); border-radius: 3mm; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 0.3mm solid var(--line); }
  .foto img { width: 88%; height: 88%; object-fit: contain; }
  h2 { font-family: Archivo, sans-serif; font-weight: 800; font-size: 9pt; letter-spacing: 0.2em; text-transform: uppercase; color: var(--brand); margin: 7mm 0 3mm; display: flex; align-items: center; gap: 3mm; }
  h2::after { content: ""; flex: 1; height: 0.3mm; background: var(--line); }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3mm; background: var(--line); border: 0.3mm solid var(--line); border-radius: 2.5mm; overflow: hidden; }
  .dato:last-child:nth-child(odd) { grid-column: span 2; }
  .dato { background: #fff; padding: 2.4mm 3.5mm; break-inside: avoid; }
  .dato dt { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--soft); }
  .dato dd { font-weight: 600; font-size: 9.6pt; margin-top: 0.4mm; }
  ol.pasos { list-style: none; counter-reset: p; display: grid; gap: 2.6mm; }
  ol.pasos li { counter-increment: p; display: grid; grid-template-columns: 7mm 1fr; gap: 3mm; align-items: start; break-inside: avoid; }
  ol.pasos li::before { content: counter(p); width: 7mm; height: 7mm; border-radius: 50%; background: var(--brand); color: #fff; font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 8.5pt; display: flex; align-items: center; justify-content: center; }
  table.codigos { width: 100%; border-collapse: collapse; font-size: 8.4pt; }
  table.codigos thead { display: table-header-group; }
  table.codigos th { background: var(--dark); color: #fff; font-family: Archivo, sans-serif; font-weight: 700; font-size: 7.4pt; letter-spacing: 0.1em; text-transform: uppercase; padding: 1.8mm 2.5mm; text-align: left; }
  table.codigos th.c, table.codigos td.c { text-align: center; }
  table.codigos td { padding: 1.5mm 2.5mm; border-bottom: 0.25mm solid var(--line); }
  table.codigos tr { break-inside: avoid; }
  table.codigos tbody tr:nth-child(even) td { background: #f8f9fb; }
  td.cod { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 8pt; }
  td.col { font-weight: 600; white-space: nowrap; }
  .sw { display: inline-block; width: 3.2mm; height: 3.2mm; border-radius: 50%; border: 0.3mm solid rgba(0,0,0,.25); vertical-align: -0.6mm; margin-right: 2mm; }
  .nota { margin-top: 7mm; padding: 3mm 4mm; border-left: 1.2mm solid var(--accent); background: #fff7ed; font-size: 7.8pt; color: #7c2d12; border-radius: 0 1.5mm 1.5mm 0; break-inside: avoid; }
</style></head>
<body>
  <div class="banda">
    <div class="logo">${MARCA}<b>WIEDMER</b></div>
    <div class="tag">FICHA TÉCNICA<small>Distribuidor mayorista · Rosario</small></div>
  </div>
  <div class="cuerpo">
    <div>${parent.brand ? `<span class="marcachip">${esc(parent.brand)}</span>` : ""}${tienda.categoria ? `<span class="cat">${esc(tienda.categoria)}</span>` : ""}</div>
    <h1>${esc(parent.name)}</h1>
    <div class="regla"></div>

    <div class="dos">
      <div>
        ${parent.description ? `<p class="desc">${esc(parent.description).replace(/\n\n/g, "</p><p class=\"desc\" style=\"margin-top:3mm\">")}</p>` : ""}
        ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
        ${tamanos.length ? `<div class="chips">${tamanos.map((s) => `<span class="chip" style="color:var(--ink);background:#fff">${esc(s)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="foto">${imagen ? `<img src="${esc(imagen)}" alt="">` : MARCA.replace('class="mark"', 'style="width:40%;color:#c7ccd6"')}</div>
    </div>

    ${datos.length ? `<h2>Datos técnicos</h2><dl class="datos">${datos.map((d) => `<div class="dato"><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join("")}</dl>` : ""}
    ${pasos.length ? `<h2>Modo de uso</h2><ol class="pasos">${pasos.map((p) => `<li><span>${esc(p)}</span></li>`).join("")}</ol>` : ""}

    <h2>${variantes.length > 1 ? "Presentaciones y códigos" : "Código"}</h2>
    ${tablaCodigos(variantes)}

    <div class="nota">
      <b>Información orientativa.</b> Los datos técnicos son los publicados por el fabricante${parent.brand ? ` (${esc(parent.brand)})` : ""} y pueden variar según la superficie, la temperatura y la humedad.
      Antes de usar, leé la etiqueta y la hoja de seguridad del producto. Los precios se consultan con tu vendedor o en wiedmer.com.ar.
      <br>Actualizada: ${esc(fecha)}.
    </div>
  </div>
</body></html>`;
}

export function pieHtml(tienda) {
  return `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#5a6475;padding:0 14mm;display:flex;justify-content:space-between;border-top:0.5px solid #e5e7eb;padding-top:5px">
    <span><b style="color:#1e3a8a">WIEDMER</b> · ${esc(tienda.direccion)} · Tel. ${esc(tienda.telefono)} · WhatsApp ${esc(tienda.whatsapp)}</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
}
