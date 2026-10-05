/**
 * Fotos de producto, traídas de los sitios de los proveedores.
 *
 *   node --env-file=.env.local scripts/fotos-proveedores.mjs catalogo
 *   node --env-file=.env.local scripts/fotos-proveedores.mjs proponer
 *   node --env-file=.env.local scripts/fotos-proveedores.mjs aplicar [--dry-run]
 *
 * Hoy el catálogo tiene 1230 artículos y ninguna foto propia. Las dos marcas
 * que más pesan —Sinteplast y Kuwait— publican las fotos de sus productos en
 * sus sitios, así que este script las trae y las deja puestas en cada artículo.
 *
 * ## Por qué son tres pasos y no uno
 *
 * Porque el paso del medio lo tiene que mirar una persona. El catálogo del
 * proveedor tiene una foto por LÍNEA ("RECUPLAST INTERIOR - MATE") y esta base
 * tiene una fila por ARTÍCULO ("Recuplast Interior Mate 4 lt."), con nombres
 * abreviados por el proveedor. Cruzar las dos listas es adivinar con reglas, y
 * las reglas se equivocan. Mejor que se equivoquen sobre un Excel que sobre la
 * base.
 *
 * Es el mismo criterio de /admin/precios: primero la previsualización, después
 * la confirmación.
 *
 *   1. `catalogo`  baja las dos listas de fotos      → datos-proveedores/catalogo.json
 *   2. `proponer`  cruza con la base y arma el Excel → fotos-propuestas.xlsx
 *   3. `aplicar`   sube las fotos aprobadas          → Supabase Storage + la base
 *
 * Entre el 2 y el 3 el Excel se abre y se revisa. La columna `aplicar` viene
 * con SI cuando el cruce es firme y con REVISAR cuando sólo se acertó la línea:
 * para dejar un artículo sin foto se borra esa celda, y para corregir la foto se
 * escribe en la columna `foto` el nombre de otra de la hoja `catalogo`.
 *
 * ## De dónde sale cada catálogo
 *
 * - **Sinteplast** (sinteplast.com.ar) arma su listado con una llamada que
 *   devuelve los 265 productos en un JSON: nombre, descripción, presentaciones
 *   y el archivo de la foto. Una sola llamada para todo el catálogo.
 * - **Kuwait** (pinturaskuwait.com) está hecho en Wix y no tiene una llamada
 *   así, pero sí un sitemap con las 27 fichas. De cada ficha se leen el título
 *   y la primera foto. Son 27 pedidos, con una pausa entre uno y otro para no
 *   golpear el sitio de nadie.
 *
 * ## Las fotos son del proveedor
 *
 * Son las fotos oficiales de los productos que Wiedmer revende, usadas para
 * mostrarlos en el catálogo mayorista. Es el uso habitual en el rubro, pero si
 * alguna marca pide que se saquen, se sacan.
 */
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import sharp from "sharp";

import { unificar } from "./unificar-fotos.mjs";
import * as XLSX from "xlsx";

/* SheetJS no toma el `fs` de Node solo cuando se lo importa como módulo ESM:
   hay que dárselo a mano o `writeFile` no escribe nada. */
XLSX.set_fs(fs);

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = path.join(raiz, "datos-proveedores");
const CATALOGO = path.join(CARPETA, "catalogo.json");
const PROPUESTAS = path.join(raiz, "fotos-propuestas.xlsx");

/** El bucket de Supabase Storage donde ya viven las fotos que sube el panel. */
const BUCKET = "productos";

/** Ancho máximo de la foto que se guarda. Más que esto no lo usa ninguna ficha. */
const ANCHO_MAXIMO = 1200;

const args = process.argv.slice(2);
const PASO = args.find((a) => !a.startsWith("--"));
const SECO = args.includes("--dry-run");
const PISAR = args.includes("--pisar");

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Comparar nombres que nadie escribió para que se comparen                    */
/* -------------------------------------------------------------------------- */

/**
 * Minúsculas y sin tildes. Es la misma normalización que usa el buscador de la
 * base (`products.search_text`), para que "Látex" y "latex" sean la misma cosa.
 */
const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Palabras que aparecen en todos los nombres y por eso no distinguen nada:
 * unidades, envases y conectores. Si no se sacaran, "Aerosol Blanco x 240 cm3"
 * y "Aerosol Negro x 240 cm3" se parecerían en un 60% sólo por el envase.
 */
const RUIDO = new Set([
  "x", "de", "la", "el", "y", "a", "por", "con", "para", "en", "al", "un", "una",
  "lt", "lts", "l", "kg", "kgs", "g", "gr", "grs", "cm3", "ml", "cc", "cm",
  /* La marca tampoco distingue: el sitio de Sinteplast firma medio catálogo
     con "SINTEPLAST" al final ("AGRESTE SINTEPLAST") y si contara como palabra,
     "Recuplast Agreste" se parecería tanto a "AGRESTE SINTEPLAST" como a
     cualquier otro RECUPLAST. */
  "sinteplast", "kuwait", "kwt",
]);

/** Las palabras que sí distinguen: sin ruido, sin números sueltos, sin letras. */
function palabras(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p.length > 1 && !RUIDO.has(p) && !/^\d+$/.test(p));
}

/** Nombre de archivo sin espacios ni acentos, para Storage. */
function aSlug(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45) || "foto";
}

/** Una pausa, para no pedirle 27 páginas seguidas a un sitio ajeno. */
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Los sitios ajenos responden mejor si el pedido parece un navegador. */
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

/* -------------------------------------------------------------------------- */
/* Paso 1: bajar los dos catálogos                                            */
/* -------------------------------------------------------------------------- */

const SINTEPLAST_LISTADO = "https://www.sinteplast.com.ar/php/producto_GET.php";
const SINTEPLAST_FOTOS = "https://www.sinteplast.com.ar/admin/uploaded/productos/";

/**
 * Sinteplast: los 265 productos en una sola llamada.
 *
 * El sitio arma su listado desde el navegador pidiéndole a esta dirección los
 * productos de una categoría. Mandando el filtro vacío devuelve el catálogo
 * entero, así que alcanza con un pedido en vez de recorrer las 34 secciones.
 */
async function catalogoSinteplast() {
  const r = await fetch(SINTEPLAST_LISTADO, {
    method: "POST",
    headers: { ...NAVEGADOR, "Content-Type": "application/x-www-form-urlencoded" },
    body: "searcher_string=",
  });
  if (!r.ok) throw new Error(`Sinteplast respondió ${r.status}`);

  const datos = await r.json();
  const prods = datos.prods ?? [];

  return prods
    .filter((p) => p.imagen)
    .map((p) => ({
      marca: "Sinteplast",
      nombre: p.nombre.trim(),
      rubro: [p.cat?.cat, p.cat?.sub].filter(Boolean).join(" / "),
      presentaciones: p.presentaciones ?? "",
      url: SINTEPLAST_FOTOS + p.imagen,
    }));
}

const KUWAIT_SITEMAP = "https://www.pinturaskuwait.com/sitemap.xml";

/**
 * Kuwait: 27 fichas, una por línea de producto.
 *
 * El sitio está hecho en Wix y arma las fichas desde su propio gestor de
 * contenidos, sin una dirección que devuelva la lista. Lo que sí tiene es el
 * sitemap —el índice que los sitios publican para los buscadores—, y ahí están
 * las direcciones de todas las fichas.
 *
 * De cada ficha se leen dos cosas:
 *   - el nombre, del `<title>` (viene como "Barnices | Pinturas Kuwait");
 *   - la foto, que es la primera imagen del contenido.
 *
 * Las fotos de Wix se sirven con el tamaño escrito en la propia dirección. Se
 * pide una de 1200 px en vez de la original, que puede pesar varios MB.
 */
async function catalogoKuwait() {
  const indice = await (await fetch(KUWAIT_SITEMAP, { headers: NAVEGADOR })).text();
  const mapas = [...indice.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const mapaProductos = mapas.find((u) => u.includes("cms-productos"));
  if (!mapaProductos) throw new Error("El sitemap de Kuwait no trae el mapa de productos");

  const listado = await (await fetch(mapaProductos, { headers: NAVEGADOR })).text();
  const urls = [...listado.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const fichas = [];
  for (const url of urls) {
    /* Dos intentos: Wix a veces devuelve la página sin el contenido dinámico, y
       una respuesta rara dejaría afuera a toda una línea de productos. */
    let nombre = "";
    let foto;
    for (const intento of [1, 2]) {
      const html = await (await fetch(url, { headers: NAVEGADOR })).text();

      const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      nombre = titulo.split("|")[0].trim().replace(/&amp;/g, "&");

      /* La primera imagen del contenido es la foto del producto: el logo y las
         redes están al final, en el pie. */
      foto = html.match(/<img[^>]+src="(https:\/\/static\.wixstatic\.com\/media\/[^"]+)"/)?.[1];

      if (foto) break;
      if (intento === 1) await esperar(1500);
    }

    if (!nombre) continue;
    if (!foto) {
      console.warn(`  (sin foto en el sitio) ${nombre}`);
      continue;
    }
    fichas.push({ marca: "Kuwait", nombre, rubro: "", presentaciones: "", url: fotoWix(foto) });
    process.stdout.write(".");
    await esperar(400);
  }
  process.stdout.write("\n");
  return fichas;
}

/**
 * Reescribe una dirección de imagen de Wix para pedirla en 1200 px.
 *
 * Wix guarda el archivo una vez y arma cada tamaño al vuelo: el pedazo
 * `/v1/fit/w_800,h_800,.../` del medio es la receta. Se la reemplaza en vez de
 * bajar la original, que en estas fichas llega a varios MB.
 */
function fotoWix(url) {
  const archivo = url.match(/\/media\/([^/]+)/)?.[1];
  if (!archivo) return url;
  const t = `w_${ANCHO_MAXIMO},h_${ANCHO_MAXIMO},q_90`;
  return `https://static.wixstatic.com/media/${archivo}/v1/fit/${t}/${archivo}`;
}

async function bajarCatalogos() {
  fs.mkdirSync(CARPETA, { recursive: true });

  console.log("Sinteplast…");
  const sinteplast = await catalogoSinteplast();
  console.log(`  ${sinteplast.length} productos con foto`);

  console.log("Kuwait…");
  const kuwait = await catalogoKuwait();
  console.log(`  ${kuwait.length} fichas con foto`);

  const catalogo = [...sinteplast, ...kuwait];
  fs.writeFileSync(CATALOGO, JSON.stringify(catalogo, null, 2));
  console.log(`\nGuardado en ${path.relative(raiz, CATALOGO)} (${catalogo.length} fotos).`);
  console.log("Siguiente paso: node --env-file=.env.local scripts/fotos-proveedores.mjs proponer");
}

/* -------------------------------------------------------------------------- */
/* Paso 2: cruzar las dos listas                                              */
/* -------------------------------------------------------------------------- */

/**
 * Las líneas de Sinteplast, que son el ancla del cruce.
 *
 * Un nombre como "Latex Interior 4 lt" no dice de quién es; "Recuplast
 * Interior Mate 4 lt." sí. Por eso no se compara nombre contra nombre: primero
 * se busca una de estas palabras en el nombre del artículo, y recién entre los
 * productos de ESA línea se elige el que más se parece.
 *
 * Sin este paso, "Manta Sint.Media" se llevaba la foto de SINTESPRAY porque
 * "Sint." empieza igual, y "Mascarilla Anti Polvo" la de ANTIBURBUJAS.
 *
 * Si el proveedor saca una línea nueva, se agrega acá.
 */
const LINEAS_SINTEPLAST = [
  "recuplast", "foresta", "acrilplast", "brilloplast", "satinplast",
  "recumix", "recublock", "creart", "king", "trimas", "ferroxin",
  "agreste", "pietra", "granit", "gress", "revo", "wow", "brik",
  "sintespray", "sintepox", "brillospray", "satinspray",
  "microcemento", "porcelanato", "hidroesmalte",
];

/**
 * Kuwait no tiene marca escrita en los nombres de esta base: sus productos
 * están cargados como "Aerosol Amarillo x 240 cm3". Lo que sí se sabe es que
 * los aerosoles de la casa son Kuwait, así que el cruce se hace por TIPO de
 * aerosol y sólo dentro de la categoría Aerosoles.
 *
 * Se lee en orden y gana la primera regla que coincide, igual que las reglas
 * de categoría de `importar-lista.mjs`: por eso "fluo" y "metalizado" van
 * antes que la línea clásica, que es la que junta a todos los colores lisos.
 *
 * El nombre de la derecha tiene que existir tal cual en el catálogo de Kuwait.
 */
const REGLAS_KUWAIT = [
  [/\bfluo/, "Colores fluorescentes"],
  [/metaliz|\bmetal\b|\bmetal\./, "Colores metalizados"],
  [/cromado/, "Colores metalizados"],
  [/esmerilado/, "Efecto Esmerilado"],
  [/convert/, "Convertidor de óxido"],
  [/antioxido/, "Pintura Antióxido"],
  [/alta temp/, "Alta temperatura 250"],
  [/blow off/, "Blow Off Gas"],
  [/membrana/, "Membrana impermeabilizable"],
  [/barniz/, "Barnices"],
  [/epoxi/, "Pintura Epoxy"],
  [/galvaniz/, "Galvanizado en frío"],
  [/silicona/, "Silicona para Vehículos"],
  [/espuma|poliuretano expandido/, "Espuma de Poliuretano Expandido"],
  /* Los colores lisos y los "Kwt": la lata común de la línea clásica. */
  [/\bkwt\b|pasteles|^aerosol |^aero color/, "Línea clásica"],
];

/**
 * ¿Alguna palabra del artículo es esta palabra del proveedor?
 *
 * Cuenta también si es su abreviatura, porque la lista del proveedor viene
 * recortada para entrar en el renglón: "Int." por "Interior", "Satin" por
 * "Satinado", "Griet." por "Grietas".
 *
 * Y cuenta si sólo cambia la última letra, que es lo que pasa con el género:
 * "Laca Marina" en la lista y "FORESTA MARINO" en el sitio son el mismo barniz.
 */
function coincide(palabraProveedor, palabrasArticulo) {
  return palabrasArticulo.some((p) => {
    if (p === palabraProveedor) return true;
    if (p.length >= 3 && palabraProveedor.startsWith(p)) return true;
    if (palabraProveedor.length >= 3 && p.startsWith(palabraProveedor)) return true;
    return (
      p.length >= 5 &&
      p.length === palabraProveedor.length &&
      p.slice(0, -1) === palabraProveedor.slice(0, -1)
    );
  });
}

/**
 * Cuánto se parece el nombre del proveedor al del artículo, de 0 a 1.
 *
 * Se mide sobre las palabras del PROVEEDOR, no sobre las del artículo: el
 * artículo trae además el envase y el color, que el proveedor no escribe
 * porque una misma foto sirve para todos los tamaños de la línea.
 */
function parecido(nombreProveedor, palabrasArticulo) {
  const pp = palabras(nombreProveedor);
  if (!pp.length) return { puntaje: 0, coincidencias: 0 };

  const coincidencias = pp.filter((p) => coincide(p, palabrasArticulo)).length;
  let puntaje = coincidencias / pp.length;

  /* Palabras que cambian el producto, no el acabado. Si el artículo dice
     "hidro" y la foto candidata no, no son lo mismo aunque compartan la línea:
     "Recuplast Hidro Bco Satin" es un esmalte al agua y "RECUPLAST INTERIOR -
     SATINADO" un látex de pared. Se le baja el puntaje para que caiga en la
     pila de revisar en vez de aplicarse sola. */
  const FUERTES = ["hidro", "epoxi", "membrana", "fibrado", "atermico"];
  const contradice = FUERTES.some(
    (f) => palabrasArticulo.includes(f) && !pp.includes(f),
  );
  if (contradice) puntaje *= 0.5;

  return { puntaje, coincidencias, contradice };
}

function proponerSinteplast(producto, catalogo) {
  const pa = palabras(producto.name);

  /* Un nombre puede nombrar dos líneas: "Recuplast Agreste" es la línea
     Recuplast y también el revestimiento Agreste, que en el sitio se llama
     "AGRESTE SINTEPLAST". Se juntan los candidatos de todas y gana el que más
     se parece, en vez de quedarse con la primera línea de la lista. */
  const lineas = LINEAS_SINTEPLAST.filter((l) => pa.includes(l));
  if (!lineas.length) return null;

  const candidatos = catalogo
    .filter(
      (c) =>
        c.marca === "Sinteplast" &&
        lineas.some((l) => palabras(c.nombre).includes(l)),
    )
    .map((c) => ({ ficha: c, ...parecido(c.nombre, pa) }))
    /* A igual parecido gana el nombre más corto, que es el más genérico de la
       línea: si no se sabe si es "3 en 1 secado rápido", la lata común. */
    .sort(
      (a, b) =>
        b.puntaje - a.puntaje ||
        palabras(a.ficha.nombre).length - palabras(b.ficha.nombre).length,
    );

  if (!candidatos.length) return null;
  const mejor = candidatos[0];
  return {
    ficha: mejor.ficha,
    puntaje: mejor.puntaje,
    /* Una sola palabra coincidiendo es la línea y nada más: la foto puede ser
       la de cualquier producto de la línea. Eso no se aplica solo. */
    seguro:
      !mejor.contradice &&
      (mejor.coincidencias >= 2 || palabras(mejor.ficha.nombre).length === 1),
    criterio: `línea ${lineas.join(" + ")}`,
    alternativas: candidatos.slice(1, 5).map((c) => c.ficha.nombre),
  };
}

function proponerKuwait(producto, catalogo) {
  if (producto.categoria !== "Aerosoles") return null;

  /* En la categoría Aerosoles también hay aerosoles de Sinteplast, como el
     "Brillospray Max Epoxi". Si el nombre nombra una línea de Sinteplast, no
     es Kuwait por más que la regla de abajo coincida. */
  const pa = palabras(producto.name);
  if (LINEAS_SINTEPLAST.some((l) => pa.includes(l))) return null;

  const n = normalizar(producto.name);
  const regla = REGLAS_KUWAIT.find(([patron]) => patron.test(n));
  if (!regla) return null;

  const ficha = catalogo.find((c) => c.marca === "Kuwait" && c.nombre === regla[1]);
  if (!ficha) {
    console.warn(`  (la regla apunta a "${regla[1]}", que no está en el catálogo de Kuwait)`);
    return null;
  }
  return { ficha, puntaje: 1, seguro: true, criterio: "regla Kuwait", alternativas: [] };
}

async function proponer() {
  if (!fs.existsSync(CATALOGO)) {
    salir("Falta el catálogo. Corré primero:\n  node --env-file=.env.local scripts/fotos-proveedores.mjs catalogo");
  }
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO, "utf8"));
  const sql = postgres(process.env.DIRECT_URL, { prepare: false });

  const productos = await sql`
    select p.id, p.sku, p.name, p.images, coalesce(c.name, '') as categoria
    from public.products p
    left join public.categories c on c.id = p.category_id
    order by p.id`;
  await sql.end();

  const filas = [];
  let conFoto = 0;
  for (const p of productos) {
    if (p.images?.length && !PISAR) { conFoto++; continue; }

    const propuesta = proponerKuwait(p, catalogo) ?? proponerSinteplast(p, catalogo);
    if (!propuesta) continue;

    filas.push({
      /* Viene marcada con SI la que es segura y con REVISAR la que sólo acertó
         la línea: esa foto es de la línea, pero puede no ser la del artículo.
         El Excel está ordenado por foto, así que se aprueban o se borran de a
         bloques. */
      aplicar: propuesta.seguro ? "SI" : "REVISAR",
      id: p.id,
      sku: p.sku,
      producto: p.name,
      categoria: p.categoria,
      marca: propuesta.ficha.marca,
      foto: propuesta.ficha.nombre,
      criterio: propuesta.criterio,
      parecido: Number(propuesta.puntaje.toFixed(2)),
      otras_opciones: propuesta.alternativas.join(" | "),
      url: propuesta.ficha.url,
    });
  }

  /* Ordenado por foto y no por artículo: así cada bloque del Excel es "estos
     doce artículos se llevan esta misma foto", que es como conviene revisarlo. */
  filas.sort(
    (a, b) =>
      a.marca.localeCompare(b.marca) ||
      a.foto.localeCompare(b.foto) ||
      a.producto.localeCompare(b.producto),
  );

  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 22 },
    { wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 9 }, { wch: 40 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(libro, hoja, "propuestas");

  /* La segunda hoja es la lista de fotos disponibles: de ahí se copia un
     nombre a la columna `foto` cuando la propuesta está equivocada. */
  const hojaCatalogo = XLSX.utils.json_to_sheet(
    catalogo.map((c) => ({ marca: c.marca, foto: c.nombre, rubro: c.rubro, presentaciones: c.presentaciones, url: c.url })),
  );
  hojaCatalogo["!cols"] = [{ wch: 12 }, { wch: 38 }, { wch: 30 }, { wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(libro, hojaCatalogo, "catalogo");

  XLSX.writeFile(libro, PROPUESTAS);

  const seguras = filas.filter((f) => f.aplicar === "SI").length;
  const fotos = new Set(filas.map((f) => f.foto)).size;
  console.log(`Artículos sin foto:      ${productos.length - conFoto}`);
  console.log(`Con propuesta:           ${filas.length}  (${fotos} fotos distintas)`);
  console.log(`  marcadas SI:           ${seguras}`);
  console.log(`  marcadas REVISAR:      ${filas.length - seguras}`);
  console.log(`\nEscrito ${path.basename(PROPUESTAS)}. Revisalo y después:`);
  console.log("  node --env-file=.env.local scripts/fotos-proveedores.mjs aplicar --dry-run");
}

/* -------------------------------------------------------------------------- */
/* Paso 3: aplicar lo aprobado                                                */
/* -------------------------------------------------------------------------- */

/**
 * Pide una contraseña sin mostrarla mientras se tipea.
 *
 * readline escribe cada tecla en pantalla a medida que llega; acá se intercepta
 * esa escritura y no se deja pasar nada mientras dura la pregunta. Es el mismo
 * truco que usa `crear-usuario.mjs`, y por lo mismo: la contraseña no se pasa
 * como argumento porque los argumentos quedan en el historial de la terminal.
 */
async function preguntar(pregunta, { oculto = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const escribir = process.stdout.write.bind(process.stdout);
  let silenciar = false;
  if (oculto) process.stdout.write = (c, ...r) => (silenciar ? true : escribir(c, ...r));

  escribir(pregunta);
  silenciar = oculto;
  const respuesta = await new Promise((resolve) => rl.question("", resolve));
  silenciar = false;
  if (oculto) { process.stdout.write = escribir; escribir("\n"); }
  rl.close();
  return respuesta.trim();
}

/**
 * Inicia sesión como admin y devuelve el token para hablar con Storage.
 *
 * ## Por qué hace falta una sesión y no una clave del proyecto
 *
 * El bucket `productos` deja escribir sólo a un admin: las políticas de la
 * migración `20260911140000_storage_imagenes.sql` preguntan por
 * `public.es_admin()`. La otra forma de entrar sería la clave secreta del
 * proyecto, que saltea todas las políticas, pero la regla de la casa es no
 * tener esa clave en ningún lado: una credencial que no existe no se filtra.
 *
 * Así que este script hace lo mismo que el panel: inicia sesión con un usuario
 * admin de verdad y sube con esa sesión.
 */
async function entrarComoAdmin(sql) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    salir("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.");
  }

  const email = await preguntar("Email del admin: ");
  const password = await preguntar("Contraseña: ", { oculto: true });

  const perfil = await sql`
    select role, active from public.profiles where lower(email) = lower(${email})`;
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

/**
 * Baja una foto del proveedor, la achica y la deja en WebP.
 *
 * Las fotos vienen como las publicó cada marca: algunas son PNG de varios MB.
 * En WebP a 1200 px la misma foto pesa unas diez veces menos y a ojo no se
 * distingue, que es el mismo criterio de `optimizar-imagenes.mjs` con las fotos
 * de categoría.
 *
 * `withoutEnlargement` es importante: si el original es más chico que 1200 px
 * no se agranda. Agrandar no inventa detalle, sólo peso y bordes borrosos.
 */
async function prepararFoto(url) {
  const r = await fetch(url, { headers: NAVEGADOR });
  if (!r.ok) throw new Error(`la foto respondió ${r.status}`);
  const original = Buffer.from(await r.arrayBuffer());

  /* Fondo blanco, producto centrado y 1000 x 1000, igual que el resto del
     catálogo (ver scripts/unificar-fotos.mjs). */
  const { final: webp } = await unificar(original);

  return { webp, pesoOriginal: original.length };
}

/** Sube la foto al bucket y devuelve la dirección pública, la que se guarda. */
async function subir({ url, key, token }, nombreArchivo, webp) {
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${nombreArchivo}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/webp",
      /* Un año de caché: el nombre lleva un sufijo único, así que el contenido
         de una dirección no cambia nunca. */
      "Cache-Control": "31536000",
    },
    body: webp,
  });
  if (!r.ok) {
    const detalle = await r.text();
    throw new Error(`Storage rechazó la subida (${r.status}): ${detalle.slice(0, 200)}`);
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
}

async function aplicar() {
  if (!fs.existsSync(PROPUESTAS)) {
    salir(`Falta ${path.basename(PROPUESTAS)}. Corré primero el paso "proponer".`);
  }
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO, "utf8"));
  const libro = XLSX.readFile(PROPUESTAS);
  const filas = XLSX.utils.sheet_to_json(libro.Sheets["propuestas"] ?? {});

  /* Aprobadas: SI, sí, x o 1. Lo que escriba una persona apurada. */
  const aprobadas = filas.filter((f) => /^(si|sí|s|x|1)$/i.test(String(f.aplicar ?? "").trim()));
  if (!aprobadas.length) salir("No hay ninguna fila marcada en la columna `aplicar`.");

  /* La columna `foto` se puede haber corregido a mano, así que la dirección se
     vuelve a buscar por nombre en el catálogo en vez de confiar en la columna
     `url`, que quedaría apuntando a la foto vieja. */
  const porNombre = new Map(catalogo.map((c) => [`${c.marca}·${c.nombre}`, c]));
  const trabajo = [];
  const perdidas = [];
  for (const f of aprobadas) {
    const ficha = porNombre.get(`${f.marca}·${String(f.foto).trim()}`);
    if (!ficha) { perdidas.push(f); continue; }
    trabajo.push({ id: String(f.id), producto: f.producto, ficha });
  }
  if (perdidas.length) {
    console.warn(`\n${perdidas.length} filas quedaron afuera: la foto que nombran no está en el catálogo.`);
    perdidas.slice(0, 10).forEach((f) => console.warn(`  ${f.id}  "${f.foto}" (${f.marca})`));
  }

  /* Una misma foto le toca a muchos artículos: se sube UNA vez y todos guardan
     la misma dirección. Sin esto serían cientos de subidas del mismo archivo. */
  const fotos = [...new Set(trabajo.map((t) => t.ficha.url))];
  console.log(`\n${trabajo.length} artículos, ${fotos.length} fotos distintas para subir.`);

  if (SECO) {
    console.log("\n(--dry-run: no se sube ni se escribe nada)");
    const porFoto = new Map();
    for (const t of trabajo) porFoto.set(t.ficha.nombre, (porFoto.get(t.ficha.nombre) ?? 0) + 1);
    [...porFoto.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([nombre, n]) => console.log(`  ${String(n).padStart(4)} artículos → ${nombre}`));
    return;
  }

  const sql = postgres(process.env.DIRECT_URL, { prepare: false });
  const sesion = await entrarComoAdmin(sql);

  const direcciones = new Map();
  let subidas = 0;
  for (const url of fotos) {
    const ficha = catalogo.find((c) => c.url === url);
    try {
      const { webp, pesoOriginal } = await prepararFoto(url);
      const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const nombre = `${aSlug(ficha.marca)}-${aSlug(ficha.nombre)}-${sufijo}.webp`;
      direcciones.set(url, await subir(sesion, nombre, webp));
      subidas++;
      const kb = (n) => `${Math.round(n / 1024)} KB`;
      console.log(`  ${ficha.nombre}  ${kb(pesoOriginal)} → ${kb(webp.length)}`);
    } catch (e) {
      console.warn(`  ✗ ${ficha.nombre}: ${e.message}`);
    }
    await esperar(200);
  }

  /* Las fotos ya están arriba; lo que falta es anotarlas. Va en una
     transacción: o quedan todas anotadas o no queda ninguna, para no terminar
     con la mitad del catálogo apuntando a fotos y la otra mitad no sin saber
     dónde se cortó. */
  const aEscribir = trabajo.filter((t) => direcciones.has(t.ficha.url));
  await sql.begin(async (tx) => {
    for (const t of aEscribir) {
      await tx`
        update public.products
        set images = ${[direcciones.get(t.ficha.url)]}::text[]
        where id = ${t.id}`;
    }
  });
  await sql.end();

  console.log(`\nListo: ${subidas} fotos subidas, ${aEscribir.length} artículos actualizados.`);
}

/* -------------------------------------------------------------------------- */

if (!process.env.DIRECT_URL) {
  salir("Falta DIRECT_URL. ¿Corriste el script con --env-file=.env.local?");
}

try {
  if (PASO === "catalogo") await bajarCatalogos();
  else if (PASO === "proponer") await proponer();
  else if (PASO === "aplicar") await aplicar();
  else {
    salir(
      "Uso: node --env-file=.env.local scripts/fotos-proveedores.mjs <paso>\n\n" +
        "  catalogo   baja las fotos que publican Sinteplast y Kuwait\n" +
        "  proponer   cruza con la base y escribe fotos-propuestas.xlsx\n" +
        "  aplicar    sube las fotos aprobadas y las anota en cada artículo\n\n" +
        "Opciones:\n" +
        "  --dry-run  (aplicar) muestra qué haría, sin tocar nada\n" +
        "  --pisar    (proponer) incluye también los artículos que YA tienen foto",
    );
  }
} catch (e) {
  salir(`\nSe cortó: ${e.message}`);
}
