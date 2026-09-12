/**
 * Fotos del sitio actual de Wiedmer (wiedmer.com.ar) para el catálogo nuevo.
 *
 *   npm run sitio:catalogo          # baja las fichas y las fotos → imagenes/sitio-wiedmer/
 *   npm run sitio:proponer          # cruza con la base           → fotos-sitio-propuestas.xlsx
 *   npm run sitio:aplicar -- --dry-run   # qué haría
 *   npm run sitio:aplicar                # sube a Storage y anota en la base
 *
 * ## Por qué tres pasos y no uno
 *
 * Es el mismo criterio que `fotos-proveedores.mjs` y que `/admin/precios`:
 * primero la previsualización, después la confirmación. El sitio viejo tiene
 * 240 fichas y esta base 1230 artículos, así que una ficha del sitio le
 * corresponde a VARIOS artículos (el mismo producto en 1/4, 1 y 4 litros) y el
 * cruce se hace por parecido de nombre. Adivinar con reglas se equivoca, y es
 * mejor que se equivoque sobre un Excel que sobre el catálogo publicado.
 *
 * ## De dónde salen las fotos
 *
 * El sitio viejo tiene su catálogo en `/productos/pag/N`, de a 64 por página.
 * Cada ficha guarda las fotos en una carpeta con su id:
 *
 *     /webfiles/wiedmer/productos/<id>/1_500x500.jpg    ← la del listado
 *     /webfiles/wiedmer/productos/<id>/1_1000x1000.jpg  ← la de la ficha
 *
 * Se baja la de 1000, que es la más grande que publica, y de paso se prueban
 * `2_`, `3_`… por si la ficha tiene más de una foto. Cuando no existe, el
 * servidor responde 404 y se corta ahí.
 *
 * ## Dónde quedan
 *
 * Los archivos bajados van a `imagenes/sitio-wiedmer/`, junto al resto de los
 * originales del proyecto. `imagenes/` está fuera de `public/` a propósito: no
 * se publica ni se sube en cada deploy (ver `.vercelignore`). Lo que termina en
 * el sitio es la copia en WebP que el paso `aplicar` sube a Supabase Storage.
 */
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import sharp from "sharp";
import * as XLSX from "xlsx";

/* La versión ESM de la librería de Excel no trae adentro el módulo de archivos
   de Node, así que `writeFile` y `readFile` fallan con "cannot save file" hasta
   que se lo pasás a mano. Hay que hacerlo antes de cualquier lectura o
   escritura. */
XLSX.set_fs(fs);

/* -------------------------------------------------------------------------- */
/* Dónde vive cada cosa                                                        */
/* -------------------------------------------------------------------------- */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOTOS = path.join(raiz, "imagenes", "sitio-wiedmer");
const CATALOGO = path.join(FOTOS, "catalogo.json");
const PROPUESTAS = path.join(raiz, "fotos-sitio-propuestas.xlsx");

const SITIO = "https://wiedmer.com.ar";
const BUCKET = "productos";
const ANCHO_MAXIMO = 1200;

/** Cuántas fotos como mucho tiene una ficha. Se prueba 1_, 2_… hasta un 404. */
const MAX_FOTOS_POR_FICHA = 4;

const args = process.argv.slice(2);
const PASO = args.find((a) => !a.startsWith("--"));
const SECO = args.includes("--dry-run");
/** Por defecto no se le toca la foto a un artículo que ya tiene una. */
const PISAR = args.includes("--pisar");

function salir(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Herramientas comunes                                                        */
/* -------------------------------------------------------------------------- */

/** Minúsculas y sin tildes, como `products.search_text` en la base. */
const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Palabras que están en todos los nombres y por eso no distinguen nada:
 * unidades, envases y conectores. Sin sacarlas, "Aerosol Blanco x 240 cm3" y
 * "Aerosol Negro x 240 cm3" se parecerían en un 60% sólo por el envase.
 */
const RUIDO = new Set([
  "x", "de", "la", "el", "y", "a", "por", "con", "para", "en", "al", "un", "una",
  "lt", "lts", "l", "kg", "kgs", "g", "gr", "grs", "cm3", "ml", "cc", "cm",
  "mts", "mt", "m", "un", "uni", "unidad",
]);

/** Las palabras que sí distinguen: sin ruido, sin números sueltos, sin letras. */
function palabras(texto) {
  return [
    ...new Set(
      normalizar(texto)
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter((p) => p.length > 1 && !RUIDO.has(p) && !/^\d+$/.test(p)),
    ),
  ];
}

/** Nombre de archivo sin espacios ni acentos. */
function aSlug(texto) {
  return (
    normalizar(texto)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45) || "foto"
  );
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

const kb = (n) => `${Math.round(n / 1024)} KB`;

/* -------------------------------------------------------------------------- */
/* Paso 1: bajar el catálogo del sitio y sus fotos                            */
/* -------------------------------------------------------------------------- */

/**
 * Saca las fichas de una página del listado.
 *
 * Se parsea con expresiones regulares y no con un parser de HTML de verdad
 * porque la página tiene una forma fija y repetida, y sumar una dependencia
 * para leer cuatro páginas no se justifica. Cada tarjeta trae, en este orden:
 * la foto (con el id adentro de la dirección), la categoría y el título.
 */
function fichasDeLaPagina(html) {
  const fichas = [];
  /* Cada tarjeta arranca en `<div class="tt-product thumbprod-center">`. Se
     corta ahí y se lee dentro de cada pedazo, así un título no se cruza con la
     foto de la tarjeta siguiente.

     El espacio después de "tt-product" NO es decorativo: adentro de cada
     tarjeta hay otro `<div class="tt-product-inside-hover">`, y sin el espacio
     el corte lo agarra también y cada ficha sale por duplicado, la segunda vez
     sin título. */
  const vistos = new Set();
  for (const trozo of html.split('<div class="tt-product ').slice(1)) {
    const foto = trozo.match(/webfiles\/wiedmer\/productos\/(\d+)\//);
    if (!foto || vistos.has(foto[1])) continue;
    vistos.add(foto[1]);

    const titulo = trozo.match(/<h2 class="tt-title">\s*<a[^>]*>([^<]+)<\/a>/);
    const categoria = trozo.match(
      /<ul class="tt-add-info">[\s\S]*?<a[^>]*>([^<]+)<\/a>/,
    );
    const enlace = trozo.match(/href="(https:\/\/wiedmer\.com\.ar\/productos\/[^"/]+)"/);

    /* Sin título no es una ficha de producto: es alguna otra tarjeta del
       maquetado que quedó con la misma clase. */
    if (!titulo) continue;

    fichas.push({
      id: foto[1],
      nombre: titulo[1].replace(/\s+/g, " ").trim(),
      categoria: (categoria?.[1] ?? "").replace(/\s+/g, " ").trim(),
      url: enlace?.[1] ?? `${SITIO}/productos/`,
    });
  }
  return fichas;
}

/**
 * Baja una foto y la deja en `imagenes/sitio-wiedmer/`.
 *
 * Devuelve `null` si no existe, que es como se sabe que la ficha no tiene más
 * fotos: se piden 1_, 2_, 3_… y se corta en el primer 404.
 */
async function bajarFoto(idFicha, n) {
  const nombre = `${idFicha}_${n}.jpg`;
  const destino = path.join(FOTOS, nombre);
  if (fs.existsSync(destino)) return { nombre, peso: fs.statSync(destino).size, cache: true };

  const r = await fetch(
    `${SITIO}/webfiles/wiedmer/productos/${idFicha}/${n}_1000x1000.jpg`,
    { headers: NAVEGADOR },
  );
  if (!r.ok) return null;

  const bytes = Buffer.from(await r.arrayBuffer());
  /* Algunos servidores contestan 200 con una página de error. Una foto de
     menos de 1 KB no es una foto. */
  if (bytes.length < 1024) return null;

  fs.writeFileSync(destino, bytes);
  return { nombre, peso: bytes.length, cache: false };
}

async function bajarCatalogo() {
  fs.mkdirSync(FOTOS, { recursive: true });

  const fichas = [];
  const vistos = new Set();

  for (let pagina = 1; ; pagina++) {
    const direccion = pagina === 1 ? `${SITIO}/productos/` : `${SITIO}/productos/pag/${pagina}`;
    const r = await fetch(direccion, { headers: NAVEGADOR });
    if (!r.ok) break;

    const nuevas = fichasDeLaPagina(await r.text()).filter((f) => !vistos.has(f.id));
    /* El listado termina cuando una página no trae ninguna ficha nueva. Es más
       robusto que confiar en un total escrito en el HTML, que puede cambiar. */
    if (!nuevas.length) break;

    nuevas.forEach((f) => vistos.add(f.id));
    fichas.push(...nuevas);
    console.log(`  página ${pagina}: ${nuevas.length} fichas`);
    await esperar(400);
  }

  if (!fichas.length) salir("El sitio no devolvió ninguna ficha. ¿Cambió el HTML del listado?");

  console.log(`\n${fichas.length} fichas. Bajando las fotos…\n`);

  let total = 0;
  let peso = 0;
  for (const ficha of fichas) {
    ficha.fotos = [];
    for (let n = 1; n <= MAX_FOTOS_POR_FICHA; n++) {
      const foto = await bajarFoto(ficha.id, n);
      if (!foto) break;
      ficha.fotos.push(foto.nombre);
      if (!foto.cache) {
        total++;
        peso += foto.peso;
        await esperar(150);
      }
    }
    const marca = ficha.fotos.length ? `${ficha.fotos.length} foto(s)` : "sin foto";
    console.log(`  ${ficha.id.padStart(4)}  ${ficha.nombre.slice(0, 48).padEnd(50)} ${marca}`);
  }

  fs.writeFileSync(CATALOGO, JSON.stringify(fichas, null, 2));
  const conFoto = fichas.filter((f) => f.fotos.length).length;
  console.log(
    `\nListo: ${conFoto} de ${fichas.length} fichas con foto · ` +
      `${total} archivos nuevos (${kb(peso)}) en imagenes/sitio-wiedmer/`,
  );
  console.log("Ahora: npm run sitio:proponer");
}

/* -------------------------------------------------------------------------- */
/* Paso 2: proponer qué foto va con qué artículo                              */
/* -------------------------------------------------------------------------- */

/**
 * Cuánto se parecen dos nombres, de 0 a 1.
 *
 * Se cuentan las palabras de la ficha del sitio que aparecen en el nombre del
 * artículo, sobre el total de palabras de la ficha. Se mide contra la ficha y
 * no contra el artículo a propósito: el artículo trae el envase en el nombre
 * ("Recuplast Interior Mate 4 lt.") y la ficha no, así que dividir por el
 * artículo castigaría a la coincidencia correcta.
 *
 * `incluye` cubre las abreviaturas del listado del proveedor: el artículo dice
 * "Sint." donde la ficha dice "Sintetico". Se acepta sólo desde 4 letras, para
 * que "mat" no se coma "matiz".
 */
function parecido(palabrasFicha, palabrasArticulo) {
  if (!palabrasFicha.length) return { puntaje: 0, comunes: 0 };

  const comunes = palabrasFicha.filter(
    (p) =>
      palabrasArticulo.includes(p) ||
      (p.length >= 4 && palabrasArticulo.some((q) => q.startsWith(p.slice(0, 4)))),
  ).length;

  return { puntaje: comunes / palabrasFicha.length, comunes };
}

/**
 * Umbrales del cruce.
 *
 * `SI` pide que coincida casi todo el nombre de la ficha y al menos dos
 * palabras: con una sola, "Aerosol" le pegaría a los 74 aerosoles del catálogo.
 * `REVISAR` es la zona gris que mira una persona.
 */
const UMBRAL_SI = 0.75;
const UMBRAL_REVISAR = 0.5;

async function proponer() {
  if (!fs.existsSync(CATALOGO)) {
    salir('Falta el catálogo del sitio. Corré primero: npm run sitio:catalogo');
  }
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO, "utf8")).filter((f) => f.fotos.length);
  if (!catalogo.length) salir("El catálogo bajado no tiene ninguna ficha con foto.");

  const sql = postgres(process.env.DIRECT_URL, { prepare: false });
  const productos = await sql`
    select p.id, p.sku, p.name, p.images, c.name as categoria
    from public.products p
    left join public.categories c on c.id = p.category_id
    order by p.name`;
  await sql.end();

  /* Las palabras de cada ficha se calculan UNA vez: si no, para 1230 artículos
     por 240 fichas se recalcularían casi 300.000 veces. */
  const fichas = catalogo.map((f) => ({ ...f, palabras: palabras(f.nombre) }));

  const filas = [];
  let sinCandidata = 0;

  for (const producto of productos) {
    const yaTiene = Array.isArray(producto.images) && producto.images.length > 0;
    if (yaTiene && !PISAR) continue;

    const palabrasArticulo = palabras(producto.name);

    let mejor = null;
    for (const ficha of fichas) {
      const { puntaje, comunes } = parecido(ficha.palabras, palabrasArticulo);
      if (comunes < 2) continue;
      if (!mejor || puntaje > mejor.puntaje) mejor = { ficha, puntaje, comunes };
    }

    if (!mejor || mejor.puntaje < UMBRAL_REVISAR) {
      sinCandidata++;
      continue;
    }

    filas.push({
      aplicar: mejor.puntaje >= UMBRAL_SI ? "SI" : "REVISAR",
      id: producto.id,
      sku: producto.sku,
      producto: producto.name,
      categoria: producto.categoria ?? "",
      foto: mejor.ficha.nombre,
      categoria_sitio: mejor.ficha.categoria,
      parecido: Math.round(mejor.puntaje * 100) / 100,
      archivo: mejor.ficha.fotos[0],
      ficha_sitio: mejor.ficha.url,
    });
  }

  if (!filas.length) {
    salir(
      "Ningún artículo cruzó con una ficha del sitio.\n" +
        "Si querés revisar también los que ya tienen foto: npm run sitio:proponer -- --pisar",
    );
  }

  /* Ordenadas por foto: cada bloque es "estos artículos se llevan esta misma
     foto", que es como conviene revisarlo. */
  filas.sort((a, b) => a.foto.localeCompare(b.foto) || a.producto.localeCompare(b.producto));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), "propuestas");
  XLSX.utils.book_append_sheet(
    libro,
    XLSX.utils.json_to_sheet(
      fichas.map((f) => ({
        nombre: f.nombre,
        categoria: f.categoria,
        archivo: f.fotos[0],
        fotos: f.fotos.length,
        ficha: f.url,
      })),
    ),
    "catalogo",
  );
  XLSX.writeFile(libro, PROPUESTAS);

  const seguras = filas.filter((f) => f.aplicar === "SI").length;
  console.log(`\n${path.basename(PROPUESTAS)}`);
  console.log(`  ${seguras} filas marcadas SI`);
  console.log(`  ${filas.length - seguras} marcadas REVISAR (mirar antes de aplicar)`);
  console.log(`  ${sinCandidata} artículos sin ninguna ficha parecida`);
  console.log("\nPara corregir una fila, escribí en la columna `foto` el nombre");
  console.log("de otra ficha de la hoja `catalogo`. Después: npm run sitio:aplicar");
}

/* -------------------------------------------------------------------------- */
/* Paso 3: subir a Storage y anotar en la base                                */
/* -------------------------------------------------------------------------- */

/**
 * Pide algo por teclado; con `oculto` no muestra lo que se tipea.
 *
 * readline escribe cada tecla a medida que llega: acá se intercepta esa
 * escritura mientras dura la pregunta. Es el mismo truco de
 * `crear-usuario.mjs`, y por lo mismo: la contraseña no se pasa como argumento
 * porque los argumentos quedan en el historial de la terminal.
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
  if (oculto) {
    process.stdout.write = escribir;
    escribir("\n");
  }
  rl.close();
  return respuesta.trim();
}

/**
 * Inicia sesión como admin y devuelve el token para hablar con Storage.
 *
 * El bucket `productos` deja escribir sólo a un admin: las políticas preguntan
 * por `public.es_admin()`. La otra forma de entrar sería la clave secreta del
 * proyecto, que saltea las políticas, pero la regla de la casa es no tenerla:
 * una credencial que no existe no se puede filtrar.
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
    throw new Error(`Storage rechazó la subida (${r.status}): ${(await r.text()).slice(0, 200)}`);
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
}

async function aplicar() {
  if (!fs.existsSync(PROPUESTAS)) {
    salir(`Falta ${path.basename(PROPUESTAS)}. Corré primero: npm run sitio:proponer`);
  }
  const catalogo = JSON.parse(fs.readFileSync(CATALOGO, "utf8"));
  const porNombre = new Map(catalogo.map((f) => [f.nombre, f]));

  const libro = XLSX.readFile(PROPUESTAS);
  const filas = XLSX.utils.sheet_to_json(libro.Sheets["propuestas"] ?? {});

  /* Aprobadas: SI, sí, x o 1. Lo que escriba una persona apurada. */
  const aprobadas = filas.filter((f) => /^(si|sí|s|x|1)$/i.test(String(f.aplicar ?? "").trim()));
  if (!aprobadas.length) salir("No hay ninguna fila marcada en la columna `aplicar`.");

  /* La columna `foto` se puede haber corregido a mano, así que el archivo se
     vuelve a buscar por ese nombre en vez de confiar en la columna `archivo`,
     que quedaría apuntando a la foto vieja. */
  const trabajo = [];
  const perdidas = [];
  for (const f of aprobadas) {
    const ficha = porNombre.get(String(f.foto ?? "").trim());
    if (!ficha || !ficha.fotos.length) {
      perdidas.push(f);
      continue;
    }
    trabajo.push({ id: String(f.id), producto: f.producto, ficha });
  }
  if (perdidas.length) {
    console.warn(`\n${perdidas.length} filas quedaron afuera: la foto que nombran no está en el catálogo.`);
    perdidas.slice(0, 10).forEach((f) => console.warn(`  ${f.id}  "${f.foto}"`));
  }
  if (!trabajo.length) salir("No quedó ninguna fila aplicable.");

  /* Una misma foto le toca a varios artículos: se sube UNA vez y todos guardan
     la misma dirección. */
  const fichas = [...new Map(trabajo.map((t) => [t.ficha.id, t.ficha])).values()];
  console.log(`\n${trabajo.length} artículos, ${fichas.length} fotos distintas para subir.`);

  if (SECO) {
    console.log("\n(--dry-run: no se sube ni se escribe nada)");
    const cuenta = new Map();
    for (const t of trabajo) cuenta.set(t.ficha.nombre, (cuenta.get(t.ficha.nombre) ?? 0) + 1);
    [...cuenta.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([nombre, n]) => console.log(`  ${String(n).padStart(4)} artículos → ${nombre}`));
    return;
  }

  const sql = postgres(process.env.DIRECT_URL, { prepare: false });
  const sesion = await entrarComoAdmin(sql);

  const direcciones = new Map();
  for (const ficha of fichas) {
    try {
      const origen = path.join(FOTOS, ficha.fotos[0]);
      const original = fs.readFileSync(origen);
      /* `withoutEnlargement`: si el original es más chico que 1200 px no se
         agranda. Agrandar no inventa detalle, sólo peso y bordes borrosos. */
      const webp = await sharp(original)
        .resize({ width: ANCHO_MAXIMO, height: ANCHO_MAXIMO, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const sufijo = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const nombre = `sitio-${aSlug(ficha.nombre)}-${sufijo}.webp`;
      direcciones.set(ficha.id, await subir(sesion, nombre, webp));
      console.log(`  ${ficha.nombre.slice(0, 48).padEnd(50)} ${kb(original.length)} → ${kb(webp.length)}`);
    } catch (e) {
      console.warn(`  ✗ ${ficha.nombre}: ${e.message}`);
    }
    await esperar(200);
  }

  /* Las fotos ya están arriba; falta anotarlas. Va en una transacción: o quedan
     todas anotadas o no queda ninguna, para no terminar con la mitad del
     catálogo apuntando a fotos y la otra mitad no, sin saber dónde se cortó. */
  const aEscribir = trabajo.filter((t) => direcciones.has(t.ficha.id));
  await sql.begin(async (tx) => {
    for (const t of aEscribir) {
      await tx`
        update public.products
        set images = ${[direcciones.get(t.ficha.id)]}::text[]
        where id = ${t.id}`;
    }
  });
  await sql.end();

  console.log(`\nListo: ${direcciones.size} fotos subidas, ${aEscribir.length} artículos actualizados.`);
}

/* -------------------------------------------------------------------------- */

const pasos = { catalogo: bajarCatalogo, proponer, aplicar };

if (!pasos[PASO]) {
  salir(
    "Uso: node scripts/fotos-sitio.mjs <paso>\n\n" +
      "  catalogo   baja las fichas y las fotos de wiedmer.com.ar\n" +
      "  proponer   cruza con la base y escribe el Excel para revisar\n" +
      "  aplicar    sube a Storage y anota (--dry-run para ver qué haría)\n\n" +
      "  --pisar    incluye también los artículos que ya tienen foto",
  );
}

await pasos[PASO]();
