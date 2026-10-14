/**
 * Limpieza de una entrada que entregó un agente (datos técnicos de un producto).
 * La comparten `fichas-cargar.mjs` (que escribe en la base) y `fichas-pdf.mjs`
 * en modo `--desde-json` (que solo previsualiza), así lo que se ve en la
 * previsualización es EXACTAMENTE lo que después se carga.
 */
const DESCARTAR = new Set(["presentaciones", "colores", "color", "presentacion", "contenido", "contenido neto"]);
const USOS = new Set(["interior", "exterior", "ambos"]);
const limpiar = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function limpiarEntrada(e) {
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
    .map((d) => ({
      label: /^ficha t[eé]cnica$/i.test(d.label ?? "") ? "Ficha técnica del fabricante" : limpiar(d.label, 80) || "Documento del fabricante",
      url: d.url,
    }));
  return {
    descripcion: limpiar(e.descripcion, 700),
    usage: USOS.has(e.uso) ? e.uso : null,
    finish: limpiar(e.terminacion, 40) || null,
    datos,
    pasos,
    docs,
    fuentes: [...new Set((e.fuentes ?? []).filter((u) => /^https?:\/\//i.test(u)))],
  };
}
