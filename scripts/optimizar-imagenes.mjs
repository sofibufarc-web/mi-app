/**
 * Convierte las fotos originales del sitio a WebP optimizado.
 *
 *     node scripts/optimizar-imagenes.mjs
 *
 * De dónde a dónde:
 *   imagenes/<lo que sea>.png   →   public/img/categorias/<slug>.webp
 *   imagenes/hero.png           →   public/img/hero.webp
 *
 * ¿Por qué hace falta este paso?
 * Las fotos originales son PNG de 1254×1254 y pesan ~2,2 MB cada una. Seis
 * fotos = 13 MB. Un celular con datos móviles tardaría una eternidad en abrir
 * la home. En WebP con calidad 80 la misma foto pesa ~10 veces menos y a ojo
 * no se distingue: WebP es un formato pensado para la web que comprime mucho
 * mejor que PNG cuando la imagen es una FOTO (el PNG está pensado para
 * dibujos y capturas de pantalla, donde no puede perder ni un píxel).
 *
 * No tocamos el tamaño en píxeles: 1254 es el original y `next/image` se
 * encarga después de servir la versión chica a un celular y la grande a un
 * monitor. Recortar acá sería tirar calidad que después no se recupera.
 *
 * Los originales viven en `imagenes/`, fuera de `public/`, para que no se
 * publiquen ni se suban al deploy. Este script NO corre en el build: se
 * ejecuta a mano cuando cambia una foto, y lo que se versiona es el resultado.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = path.join(raiz, "imagenes");
const PUBLICO = path.join(raiz, "public", "img");

/**
 * Qué archivo original corresponde a cada categoría.
 *
 * El mapa es explícito y no adivina por nombre de archivo a propósito: los
 * originales vienen con espacios, acentos y a veces un espacio de más al final
 * ("rodillos y pinceles .png"). Escribirlo a mano evita sorpresas silenciosas
 * del tipo "esta categoría se quedó sin foto y nadie se dio cuenta".
 *
 * La clave es el `slug` de la categoría en `src/data/categories.json`.
 */
const CATEGORIAS = {
  pinturas: "pinturas.png",
  aerosoles: "aerosoles.png",
  "rodillos-y-pinceles": "rodillos y pinceles .png",
  "lijado-y-espatulado": "lijado y espatulado.png",
  "limpieza-y-proteccion": "limpieza y proteccion.png",
  impermeabilizantes: "impermeabilizantes.png",
};

/**
 * Fotos que no son de una categoría. Hoy es una sola: la del hero de la home.
 * Van a `public/img/` a secas, no a `public/img/categorias/`.
 */
const SUELTAS = {
  hero: "hero.png",
};

/** Las dos listas, aplanadas en "de dónde a dónde". */
const TRABAJOS = [
  ...Object.entries(CATEGORIAS).map(([slug, archivo]) => ({
    nombre: slug,
    archivo,
    salida: path.join(PUBLICO, "categorias", `${slug}.webp`),
  })),
  ...Object.entries(SUELTAS).map(([nombre, archivo]) => ({
    nombre,
    archivo,
    salida: path.join(PUBLICO, `${nombre}.webp`),
  })),
];

/** Bytes → "1,2 MB", para que el resumen se lea. */
function peso(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const disponibles = await readdir(ORIGEN);
  let totalAntes = 0;
  let totalDespues = 0;

  for (const { nombre, archivo, salida } of TRABAJOS) {
    if (!disponibles.includes(archivo)) {
      console.error(`✗ ${nombre}: falta "${archivo}" en imagenes/`);
      continue;
    }

    // La carpeta de destino puede no existir todavía (por ejemplo la primera
    // vez que se corre en un clon nuevo del repo).
    await mkdir(path.dirname(salida), { recursive: true });

    const entrada = path.join(ORIGEN, archivo);

    const antes = (await stat(entrada)).size;

    const buffer = await sharp(entrada)
      // quality 80 es el punto donde WebP deja de mejorar a la vista pero
      // sigue bajando de peso. effort 6 (de 0 a 6) le da más tiempo al
      // compresor: tarda un poco más acá, pero el archivo queda más chico
      // para siempre.
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    await writeFile(salida, buffer);

    totalAntes += antes;
    totalDespues += buffer.length;

    const ahorro = Math.round((1 - buffer.length / antes) * 100);
    console.log(
      `✓ ${nombre.padEnd(24)} ${peso(antes)} → ${peso(buffer.length)}  (−${ahorro}%)`,
    );
  }

  console.log(
    `\nTotal: ${peso(totalAntes)} → ${peso(totalDespues)} ` +
      `(−${Math.round((1 - totalDespues / totalAntes) * 100)}%)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
