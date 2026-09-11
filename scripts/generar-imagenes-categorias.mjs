/**
 * Genera las ilustraciones SVG de las categorías en /public/img/categorias/.
 *
 * Son placeholders geométricos con la paleta de la marca: sirven hasta que
 * haya fotos reales. Se regeneran con:
 *
 *   node scripts/generar-imagenes-categorias.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "img", "categorias");

const BRAND = "#113bc2";
const BRAND_DARK = "#0d2d94";
const SURFACE = "#eef2ff";

/** Envuelve el dibujo en un lienzo 400x300 con fondo suave. */
function canvas(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img">
  <rect width="400" height="300" fill="${SURFACE}"/>
  ${inner}
</svg>
`;
}

const ilustraciones = {
  // Lata de pintura con pincelada
  pinturas: canvas(`
  <path d="M120 120h160v130a20 20 0 0 1-20 20H140a20 20 0 0 1-20-20z" fill="${BRAND}"/>
  <rect x="120" y="100" width="160" height="24" rx="6" fill="${BRAND_DARK}"/>
  <path d="M150 90c0-30 100-30 100 0" stroke="${BRAND_DARK}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M150 180h100v40H150z" fill="#fff" opacity=".55"/>`),

  // Aerosol con nube de rociado
  aerosoles: canvas(`
  <rect x="155" y="110" width="90" height="160" rx="14" fill="${BRAND}"/>
  <rect x="180" y="78" width="40" height="34" rx="6" fill="${BRAND_DARK}"/>
  <rect x="172" y="60" width="56" height="20" rx="8" fill="${BRAND_DARK}"/>
  <g fill="${BRAND_DARK}" opacity=".45">
    <circle cx="270" cy="60" r="8"/><circle cx="300" cy="82" r="6"/>
    <circle cx="292" cy="42" r="5"/><circle cx="322" cy="60" r="4"/>
  </g>
  <rect x="170" y="150" width="60" height="50" rx="4" fill="#fff" opacity=".55"/>`),

  // Rodillo con mango
  "rodillos-y-pinceles": canvas(`
  <rect x="90" y="90" width="180" height="62" rx="18" fill="${BRAND}"/>
  <rect x="104" y="104" width="152" height="34" rx="10" fill="#fff" opacity=".45"/>
  <path d="M180 152v40h60v70" stroke="${BRAND_DARK}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="226" y="238" width="28" height="46" rx="10" fill="${BRAND_DARK}"/>`),

  // Espátula y taco de lija
  "lijado-y-espatulado": canvas(`
  <path d="M110 70h120l-20 120h-80z" fill="${BRAND}"/>
  <rect x="140" y="190" width="60" height="70" rx="10" fill="${BRAND_DARK}"/>
  <rect x="250" y="150" width="110" height="80" rx="8" fill="${BRAND_DARK}"/>
  <g fill="#fff" opacity=".5">
    <circle cx="272" cy="172" r="4"/><circle cx="300" cy="190" r="4"/>
    <circle cx="330" cy="170" r="4"/><circle cx="290" cy="214" r="4"/>
    <circle cx="336" cy="208" r="4"/>
  </g>`),

  // Guante y gota
  "limpieza-y-proteccion": canvas(`
  <path d="M130 150v-60a16 16 0 0 1 32 0v50h10V70a16 16 0 0 1 32 0v70h10V90a16 16 0 0 1 32 0v90a80 80 0 0 1-80 80h-4a64 64 0 0 1-64-64v-30a16 16 0 0 1 32 0z" fill="${BRAND}"/>
  <path d="M320 110c18 24 28 40 28 54a28 28 0 1 1-56 0c0-14 10-30 28-54z" fill="${BRAND_DARK}"/>`),

  // Techo con capas y agua
  impermeabilizantes: canvas(`
  <path d="M60 140 200 60l140 80v20H60z" fill="${BRAND_DARK}"/>
  <rect x="60" y="168" width="280" height="26" rx="6" fill="${BRAND}"/>
  <rect x="60" y="202" width="280" height="26" rx="6" fill="${BRAND}" opacity=".65"/>
  <path d="M70 252q22-22 44 0t44 0 44 0 44 0 44 0" stroke="${BRAND_DARK}" stroke-width="10" fill="none" stroke-linecap="round"/>`),

  // Rollo de cinta con la punta despegada
  "cintas-y-adhesivos": canvas(`
  <circle cx="170" cy="170" r="92" fill="${BRAND}"/>
  <circle cx="170" cy="170" r="38" fill="${SURFACE}"/>
  <circle cx="170" cy="170" r="66" fill="#fff" opacity=".25"/>
  <path d="M248 122 356 66l16 30-108 56z" fill="${BRAND_DARK}"/>`),

  // Martillo y tuerca
  "ferreteria-y-herramientas": canvas(`
  <rect x="150" y="120" width="28" height="150" rx="10" fill="${BRAND_DARK}"/>
  <path d="M96 60h96a18 18 0 0 1 18 18v34a18 18 0 0 1-18 18H96l22-35z" fill="${BRAND}"/>
  <path d="M300 150l39 22v46l-39 22-39-22v-46z" fill="${BRAND}"/>
  <circle cx="300" cy="195" r="17" fill="${SURFACE}"/>`),
};

await mkdir(OUT_DIR, { recursive: true });

for (const [slug, svg] of Object.entries(ilustraciones)) {
  const file = path.join(OUT_DIR, `${slug}.svg`);
  await writeFile(file, svg, "utf8");
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}
