/**
 * Unifica las fotos de producto: mismo fondo, mismo encuadre, mismo tamaño.
 *
 *   node scripts/unificar-fotos.mjs prueba            # 10 fotos de muestra
 *   node scripts/unificar-fotos.mjs prueba 303_1 286_1 # las que elijas
 *
 * No toca los originales ni la base: lee de imagenes/sitio-wiedmer/ y escribe
 * en imagenes/prueba-unificada/, con una imagen "antes | después" por foto.
 *
 * Qué hace con cada foto (sin IA, solo sharp):
 *  1. FONDO: el color del fondo se estima con los píxeles del borde (la
 *     mediana, que no se deja engañar por un producto que roza el borde) y se
 *     multiplica cada canal para que ese color pase a blanco puro. Es la
 *     misma idea que el "balance de blancos" de una cámara.
 *  2. PUNTO BLANCO: todo lo que quedó casi blanco (>= BLANCO) se manda a 255.
 *     Borra los degradados leves y las sombras suaves del fondo.
 *  3. ENCUADRE: se busca dónde hay "algo que no es blanco" y se recorta a ese
 *     rectángulo.
 *  4. TAMAÑO: el recorte se achica (nunca se agranda de más) para entrar en el
 *     lienzo con el mismo margen, y se centra sobre blanco.
 */
import sharp from "sharp";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENTRADA = "imagenes/sitio-wiedmer";
const SALIDA = "imagenes/prueba-unificada";

const LADO = 1000; // lienzo final: cuadrado de 1000 x 1000
const MARGEN = 0.08; // 8% de aire en cada lado
const BLANCO = 232; // por encima de esto se considera fondo
const UMBRAL_OBJETO = 40; // cuánto debe distar de blanco un píxel para ser "producto"
const CALIDAD = 85;
const MAX_AMPLIACION = 1.5; // un producto nunca se agranda más de 1,5x (más se ve pixelado)
const NITIDEZ = 0.7; // realce leve que compensa lo blando de agrandar

/** Mediana de un arreglo de números. */
function mediana(valores) {
  const orden = Float64Array.from(valores).sort();
  return orden[Math.floor(orden.length / 2)];
}

/** Color de fondo [r,g,b]: mediana de una franja de 12 px alrededor de la foto. */
function colorDeFondo(data, w, h, canales) {
  const franja = 12;
  const r = [], g = [], b = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= franja && x < w - franja && y >= franja && y < h - franja) continue;
      const i = (y * w + x) * canales;
      r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]);
    }
  }
  return [mediana(r), mediana(g), mediana(b)];
}

/** Rectángulo que contiene todo lo que no es fondo. */
function cajaDelProducto(data, w, h, canales) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * canales;
      const distancia = 255 - Math.min(data[i], data[i + 1], data[i + 2]);
      if (distancia > UMBRAL_OBJETO) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { left: 0, top: 0, width: w, height: h }; // foto en blanco
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

export async function unificar(rutaEntrada, { maxAmpliacion = MAX_AMPLIACION, nitidez = NITIDEZ } = {}) {
  // 1. Fondo -> blanco. Se trabaja en un buffer plano de 3 canales.
  const { data: crudo, info } = await sharp(rutaEntrada)
    .flatten({ background: "#ffffff" }) // la transparencia se pinta de blanco (si no, queda negra o gris)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;

  const fondo = colorDeFondo(crudo, w, h, channels);
  const ganancia = fondo.map((c) => 255 / Math.max(c, 1));

  // 2. Punto blanco: out = in * ganancia * (255 / BLANCO); sharp recorta a 255.
  const k = 255 / BLANCO;
  const corregida = Buffer.alloc(crudo.length);
  for (let i = 0; i < crudo.length; i += channels) {
    for (let c = 0; c < 3; c++) {
      corregida[i + c] = Math.min(255, Math.round(crudo[i + c] * ganancia[c] * k));
    }
  }

  // 3. Encuadre sobre la imagen ya corregida.
  const caja = cajaDelProducto(corregida, w, h, channels);

  // 4. Recortar, achicar para entrar en el lienzo con margen, y centrar.
  const util = Math.round(LADO * (1 - MARGEN * 2));
  // Escala que haría falta para llenar el espacio útil; si es mayor que
  // MAX_AMPLIACION se frena ahí: estirar más solo agranda los píxeles y la
  // foto se ve borrosa. Esa foto queda marcada como "chica".
  const escalaIdeal = util / Math.max(caja.width, caja.height);
  const escala = Math.min(escalaIdeal, maxAmpliacion);
  const chica = escalaIdeal > maxAmpliacion;
  const recorte = await sharp(corregida, { raw: { width: w, height: h, channels } })
    .extract(caja)
    .resize(Math.round(caja.width * escala), Math.round(caja.height * escala), { kernel: "lanczos3" })
    .sharpen(nitidez && escala > 1 ? { sigma: nitidez } : false) // realce leve solo si se agrandó
    .png({ compressionLevel: 0 }) // intermedio: sin comprimir, solo para pasárselo al lienzo
    .toBuffer();

  const final = await sharp({
    create: { width: LADO, height: LADO, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: recorte, gravity: "centre" }])
    .webp({ quality: CALIDAD })
    .toBuffer();

  return { final, fondo, caja, chica, escala };
}

/** Pone "antes" y "después" lado a lado, para mirar la diferencia de un vistazo. */
async function comparar(rutaEntrada, final) {
  const antes = await sharp(rutaEntrada).resize(500, 500).toBuffer();
  const despues = await sharp(final).resize(500, 500).toBuffer();
  return sharp({
    create: { width: 1020, height: 500, channels: 3, background: "#cccccc" },
  })
    .composite([
      { input: antes, left: 0, top: 0 },
      { input: despues, left: 520, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** 10 fotos repartidas por toda la lista, para ver casos variados. */
function elegirMuestra() {
  const todas = readdirSync(ENTRADA).filter((f) => /_1\.(jpe?g|png)$/i.test(f)).sort();
  const paso = todas.length / 10;
  return Array.from({ length: 10 }, (_, i) => path.parse(todas[Math.floor(i * paso)]).name);
}

async function cli() {
  const [modo, ...nombres] = process.argv.slice(2);

  if (modo === "todas") {
    // Todas las fotos de ENTRADA -> imagenes/fotos-unificadas/<nombre>.webp
    const destino = "imagenes/fotos-unificadas";
    mkdirSync(destino, { recursive: true });
    const archivos = readdirSync(ENTRADA).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
    const chicas = [];
    const fallidas = [];
    for (const [i, archivo] of archivos.entries()) {
      const nombre = path.parse(archivo).name;
      try {
        const { final, chica, escala } = await unificar(path.join(ENTRADA, archivo));
        await sharp(final).toFile(path.join(destino, `${nombre}.webp`));
        if (chica) chicas.push({ nombre, escala: escala.toFixed(2) });
      } catch (e) {
        fallidas.push(`${nombre}: ${e.message}`);
      }
      if ((i + 1) % 50 === 0) console.log(`${i + 1}/${archivos.length}`);
    }
    console.log(`\nListas: ${archivos.length - fallidas.length} de ${archivos.length}`);
    console.log(`Fotos chicas (el producto ocupa poco de la foto original): ${chicas.length}`);
    writeFileSync(path.join(destino, "_fotos-chicas.txt"), chicas.map((c) => `${c.nombre}\t${c.escala}`).join("\n"));
    if (fallidas.length) console.log("Fallaron:", fallidas);
    return;
  }

  if (modo !== "prueba") {
    console.error("Uso: node scripts/unificar-fotos.mjs prueba|todas [nombre ...]");
    process.exit(1);
  }

  mkdirSync(SALIDA, { recursive: true });
  const muestra = nombres.length ? nombres : elegirMuestra();

  for (const nombre of muestra) {
    const archivo = readdirSync(ENTRADA).find((f) => path.parse(f).name === nombre);
    if (!archivo) {
      console.log(`${nombre}: no existe`);
      continue;
    }
    const ruta = path.join(ENTRADA, archivo);
    const { final, fondo, caja } = await unificar(ruta);
    await sharp(final).toFile(path.join(SALIDA, `${nombre}.webp`));
    await sharp(await comparar(ruta, final)).toFile(path.join(SALIDA, `${nombre}-comparacion.jpg`));
    console.log(`${nombre}: fondo ${fondo.join(",")} · producto ${caja.width}x${caja.height}`);
  }

}

/* Solo corre la línea de comandos si el archivo se ejecuta directo (y no cuando
   otro script lo importa para usar `unificar`). */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cli();
}
