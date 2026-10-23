import "server-only";

import type {
  ParentFacets,
  ParentFilters,
  ProductParent,
  ProductUsage,
  TechnicalSheet,
  AppUser,
  Category,
  CategoryInput,
  Product,
  ProductFilters,
  ProductInput,
  Role,
  StoreConfig,
} from "@/data/types";
import { sql } from "@/lib/db";
import { normalizeText, slugify, uniqueSlug } from "@/lib/slug";

/**
 * ★ CAPA DE ACCESO A DATOS ★
 * ---------------------------------------------------------------------------
 * Este es el ÚNICO archivo de la app que sabe de dónde salen los datos.
 * Páginas, componentes y route handlers importan de acá y nunca escriben SQL.
 *
 * Los datos viven en **Postgres (Supabase)**. Antes eran archivos .json en
 * `src/data/`; el esquema y la migración de esos datos están en
 * `supabase/migrations/`.
 *
 * ## Dos formas de nombrar lo mismo
 *
 * Postgres usa snake_case (`category_id`, `created_at`) y la app camelCase
 * (`categoryId`, `createdAt`). La traducción vive acá y en ningún otro lado:
 * son las funciones `aProducto`, `aCategoria` y `aConfig` de más abajo. Por eso
 * el resto de la app no se enteró de la migración.
 *
 * ## Tres detalles del driver que conviene tener presentes
 *
 * 1. **`numeric` llega como texto.** `price` vuelve como `"89900.00"`, no como
 *    número. No es un capricho: un `numeric` de Postgres admite más precisión
 *    que un `number` de JavaScript, así que el driver no convierte por su
 *    cuenta para no perder centavos en silencio. Convertimos nosotros con
 *    `Number()`, que para precios en pesos es de sobra.
 * 2. **Las fechas llegan como `Date`.** Los tipos de la app las quieren como
 *    texto ISO, así que van con `.toISOString()`.
 * 3. **`NULL` no es lo mismo que `""`.** En los JSON, "sin categoría" era la
 *    cadena vacía. En la base es `NULL`, que es lo que una clave foránea sabe
 *    manejar. La traducción en los dos sentidos también pasa por acá.
 *
 * `import "server-only"` hace que el build falle si alguien importa este módulo
 * desde un Client Component: evita que la cadena de conexión llegue al navegador.
 */

/* -------------------------------------------------------------------------- */
/* Traducción base ↔ app                                                       */
/* -------------------------------------------------------------------------- */

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  category_id: string | null;
  brand: string | null;
  unit: string | null;
  stock: number | null;
  featured: boolean;
  active: boolean;
  images: string[];
  created_at: Date;
  updated_at: Date;
  parent_id: string | null;
  color: string | null;
  color_hex: string | null;
  size_label: string | null;
};

type ParentRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  category_id: string | null;
  usage: ProductUsage | null;
  finish: string | null;
  images: string[];
  technical: TechnicalSheet;
  active: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  parent_id: string | null;
};

type StoreConfigRow = {
  store_name: string;
  logo_text: string;
  logo_image: string | null;
  whatsapp_number: string;
  welcome_title: string;
  welcome_text: string;
  contact: StoreConfig["contact"];
  colors: StoreConfig["colors"];
};

function aProducto(r: ProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: Number(r.price),
    categoryId: r.category_id ?? "",
    brand: r.brand ?? undefined,
    unit: r.unit ?? undefined,
    stock: r.stock,
    featured: r.featured,
    active: r.active,
    images: r.images,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    parentId: r.parent_id ?? undefined,
    color: r.color ?? undefined,
    colorHex: r.color_hex ?? undefined,
    sizeLabel: r.size_label ?? undefined,
  };
}

function aPadre(r: ParentRow, variants: Product[]): ProductParent {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    brand: r.brand ?? undefined,
    categoryId: r.category_id ?? "",
    usage: r.usage ?? undefined,
    finish: r.finish ?? undefined,
    images: r.images,
    technical: r.technical ?? {},
    active: r.active,
    variants,
  };
}

function aCategoria(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? undefined,
    image: r.image ?? undefined,
    order: r.sort_order,
    parentId: r.parent_id ?? undefined,
  };
}

function aConfig(r: StoreConfigRow): StoreConfig {
  return {
    storeName: r.store_name,
    logoText: r.logo_text,
    logoImage: r.logo_image ?? undefined,
    whatsappNumber: r.whatsapp_number,
    welcomeTitle: r.welcome_title,
    welcomeText: r.welcome_text,
    contact: r.contact,
    colors: r.colors,
  };
}

/** Cadena vacía → NULL. Es la convención de "sin categoría" / "sin dato". */
function oNulo(valor: string | null | undefined): string | null {
  return valor === undefined || valor === "" ? null : valor;
}

/**
 * Escapa los comodines de LIKE. Sin esto, buscar "50%" traería cualquier cosa
 * que empiece con 50, porque `%` significa "lo que sea" adentro de un LIKE.
 */
function paraLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Devuelve un slug libre para `texto` en la tabla indicada.
 *
 * No trae todos los slugs de la tabla: pide solo los que podrían chocar, o sea
 * el slug base y los que arrancan con "base-". Después `uniqueSlug` (el mismo
 * de siempre) elige entre esos.
 */
async function slugLibre(
  tabla: "products" | "categories" | "product_parents",
  texto: string,
  excluirId?: string,
): Promise<string> {
  const base = slugify(texto) || "item";
  const filas = await sql<{ slug: string }[]>`
    select slug from ${sql(tabla)}
    where (slug = ${base} or slug like ${`${base}-%`})
      and id is distinct from ${excluirId ?? null}`;
  return uniqueSlug(texto, filas.map((f) => f.slug));
}

/** Fragmento de SQL: lo que devuelve sql`...` cuando se usa como pedazo. */
type Fragmento = ReturnType<typeof sql<never[]>>;

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve productos con filtros opcionales.
 *
 * Importante: `onlyActive` NO viene en true por defecto. El catálogo público
 * tiene que pedirlo explícitamente; el panel necesita ver también los inactivos.
 *
 * Los filtros se arman como pedazos de SQL sueltos y se pegan con AND. Los
 * valores nunca se concatenan al texto de la consulta: viajan como parámetros
 * (`$1`, `$2`…), que es lo que hace imposible una inyección de SQL.
 */
/** Arma el `where` a partir de los filtros. Lo comparten el listado y el conteo. */
function dondeDe(filters: ProductFilters): Fragmento {
  const condiciones: Fragmento[] = [];

  if (filters.onlyActive) {
    condiciones.push(sql`p.active`);
  }

  if (filters.categorySlug) {
    // Si el slug no existe, la subconsulta da NULL y no matchea ningún
    // producto: el mismo resultado que devolvía la versión con JSON.
    condiciones.push(
      sql`p.category_id = (select c.id from public.categories c where c.slug = ${filters.categorySlug})`,
    );
  }

  if (filters.categoryId !== undefined && filters.categoryId !== "") {
    condiciones.push(sql`p.category_id = ${filters.categoryId}`);
  }

  if (filters.featured !== undefined) {
    condiciones.push(sql`p.featured = ${filters.featured}`);
  }

  if (filters.search) {
    // search_text es una columna que calcula la base: nombre + sku +
    // descripción + marca, en minúsculas y sin tildes. Normalizamos la
    // búsqueda igual para que "latex" encuentre "Látex".
    const termino = paraLike(normalizeText(filters.search));
    condiciones.push(sql`p.search_text like ${`%${termino}%`}`);
  }

  if (typeof filters.minPrice === "number") {
    condiciones.push(sql`p.price >= ${filters.minPrice}`);
  }
  if (typeof filters.maxPrice === "number") {
    condiciones.push(sql`p.price <= ${filters.maxPrice}`);
  }

  return condiciones.length
    ? condiciones.reduce((acumulado, actual) => sql`${acumulado} and ${actual}`)
    : sql`true`;
}

/** Cuántos productos cumplen los filtros (sin paginar). Sirve para armar la paginación. */
export async function countProducts(filters: ProductFilters = {}): Promise<number> {
  const [fila] = await sql<{ total: number }[]>`
    select count(*)::int as total from public.products p
    where ${dondeDe(filters)}`;
  return fila.total;
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const donde = dondeDe(filters);

  // Ordenar por nombre "a la española": ignorando mayúsculas y tildes, para que
  // "Ácido" no quede después de "Zinc". El id al final solo desempata, así dos
  // productos con el mismo nombre siempre salen en el mismo orden.
  const orden =
    filters.sort === "precio-asc"
      ? sql`p.price asc, p.id`
      : filters.sort === "precio-desc"
        ? sql`p.price desc, p.id`
        : filters.sort === "recientes"
          ? sql`p.updated_at desc, p.id`
          : sql`public.immutable_unaccent(lower(p.name)) asc, p.id`;

  const filas = await sql<ProductRow[]>`
    select p.* from public.products p
    where ${donde}
    order by ${orden}
    ${filters.limit !== undefined ? sql`limit ${filters.limit} offset ${filters.offset ?? 0}` : sql``}`;

  return filas.map(aProducto);
}

/* -------------------------------------------------------------------------- */
/* Productos padre + variantes                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Orden natural de tamaños: "1/4 lt" < "1/2 lt" < "1 lt" < "4 lt" < "20 lt".
 * Se compara por el número (las fracciones se evalúan) y después por el texto.
 */
function valorTamano(t?: string): number {
  if (!t) return 0;
  const m = t.match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?/);
  if (!m) return 0;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

export function ordenarVariantes(variantes: Product[]): Product[] {
  return [...variantes].sort(
    (a, b) =>
      (a.color ?? "").localeCompare(b.color ?? "", "es") ||
      valorTamano(a.sizeLabel) - valorTamano(b.sizeLabel) ||
      a.sku.localeCompare(b.sku, "es", { numeric: true }),
  );
}

/** La categoría y sus subcategorías: "Doble A" muestra también lo de Lijas, Cintas y Varios. */
function deLaCategoria(id: string): Fragmento {
  return sql`(select c.id from public.categories c where c.id = ${id} or c.parent_id = ${id})`;
}

/** Arma el `where` de los padres: solo los que tienen alguna variante activa. */
function dondePadres(f: ParentFilters): Fragmento {
  const cond: Fragmento[] = [
    sql`g.active`,
    sql`exists (select 1 from public.products v where v.parent_id = g.id and v.active)`,
  ];
  if (f.categoryId) cond.push(sql`g.category_id in ${deLaCategoria(f.categoryId)}`);
  if (f.brand) cond.push(sql`g.brand = ${f.brand}`);
  if (f.usage) cond.push(sql`(g.usage = ${f.usage} or g.usage = 'ambos')`);
  if (f.finish) cond.push(sql`g.finish = ${f.finish}`);
  if (f.size) {
    cond.push(
      sql`exists (select 1 from public.products v where v.parent_id = g.id and v.active and v.size_label = ${f.size})`,
    );
  }
  if (f.color) {
    cond.push(
      sql`exists (select 1 from public.products v where v.parent_id = g.id and v.active and v.color = ${f.color})`,
    );
  }
  if (f.search) {
    // Busca en el padre (nombre/marca) y en cualquier variante (incluye el
    // código, porque search_text lo trae): "36230" encuentra el esmalte.
    const termino = `%${paraLike(normalizeText(f.search))}%`;
    cond.push(
      sql`(public.immutable_unaccent(lower(g.name)) like ${termino}
        or exists (select 1 from public.products v where v.parent_id = g.id and v.active and v.search_text like ${termino}))`,
    );
  }
  return cond.reduce((a, c) => sql`${a} and ${c}`);
}

async function variantesDe(ids: string[]): Promise<Map<string, Product[]>> {
  const mapa = new Map<string, Product[]>();
  if (ids.length === 0) return mapa;
  const filas = await sql<ProductRow[]>`
    select * from public.products where parent_id = any(${ids}) and active`;
  for (const fila of filas) {
    const lista = mapa.get(fila.parent_id!) ?? [];
    lista.push(aProducto(fila));
    mapa.set(fila.parent_id!, lista);
  }
  for (const [id, lista] of mapa) mapa.set(id, ordenarVariantes(lista));
  return mapa;
}

/** Una página de productos padre (con sus variantes) y el total sin paginar. */
export async function getParents(
  filters: ParentFilters = {},
): Promise<{ items: ProductParent[]; total: number }> {
  const donde = dondePadres(filters);
  const orden =
    filters.sort === "precio-asc"
      ? sql`(select min(v.price) from public.products v where v.parent_id = g.id and v.active) asc, g.id`
      : filters.sort === "precio-desc"
        ? sql`(select min(v.price) from public.products v where v.parent_id = g.id and v.active) desc, g.id`
        : sql`public.immutable_unaccent(lower(g.name)) asc, g.id`;

  const [conteo, filas] = await Promise.all([
    sql<{ total: number }[]>`
      select count(*)::int as total from public.product_parents g where ${donde}`,
    sql<ParentRow[]>`
      select g.* from public.product_parents g
      where ${donde}
      order by ${orden}
      ${filters.limit !== undefined ? sql`limit ${filters.limit} offset ${filters.offset ?? 0}` : sql``}`,
  ]);

  const variantes = await variantesDe(filas.map((f) => f.id));
  return {
    items: filas.map((f) => aPadre(f, variantes.get(f.id) ?? [])),
    total: conteo[0].total,
  };
}

/** Por categoría: cuántos productos (padres) tiene y sus marcas más frecuentes. */
export async function getCategoryStats(): Promise<
  Map<string, { count: number; brands: string[] }>
> {
  // Cada producto cuenta para su categoría y, si esta es una subcategoría,
  // también para la de arriba (por eso el `union all`).
  const filas = await sql<{ category_id: string; brand: string | null; n: number }[]>`
    select x.cid as category_id, x.brand, count(*)::int as n
    from (
      select g.category_id as cid, g.brand from public.product_parents g
      where g.active and g.category_id is not null
        and exists (select 1 from public.products v where v.parent_id = g.id and v.active)
      union all
      select c.parent_id, g.brand from public.product_parents g
      join public.categories c on c.id = g.category_id
      where g.active and c.parent_id is not null
        and exists (select 1 from public.products v where v.parent_id = g.id and v.active)
    ) x
    group by x.cid, x.brand`;
  const mapa = new Map<string, { count: number; brands: { name: string; n: number }[] }>();
  for (const f of filas) {
    const e = mapa.get(f.category_id) ?? { count: 0, brands: [] };
    e.count += f.n;
    if (f.brand) e.brands.push({ name: f.brand, n: f.n });
    mapa.set(f.category_id, e);
  }
  return new Map(
    [...mapa].map(([id, e]) => [
      id,
      { count: e.count, brands: e.brands.sort((a, b) => b.n - a.n).slice(0, 6).map((b) => b.name) },
    ]),
  );
}

export async function getParentBySlug(slug: string): Promise<ProductParent | null> {
  const filas = await sql<ParentRow[]>`
    select * from public.product_parents where slug = ${slug} and active limit 1`;
  if (!filas[0]) return null;
  const variantes = await variantesDe([filas[0].id]);
  const lista = variantes.get(filas[0].id) ?? [];
  return lista.length ? aPadre(filas[0], lista) : null;
}

/** El padre al que pertenece un código (para el enlace `?codigo=36230`). */
export async function getParentBySku(sku: string): Promise<ProductParent | null> {
  const filas = await sql<{ slug: string }[]>`
    select g.slug from public.product_parents g
    join public.products p on p.parent_id = g.id
    where lower(p.sku) = lower(${sku}) and p.active limit 1`;
  return filas[0] ? getParentBySlug(filas[0].slug) : null;
}

/** Opciones para los filtros laterales de una categoría. */
export async function getParentFacets(categoryId?: string): Promise<ParentFacets> {
  const donde = categoryId ? sql`g.category_id in ${deLaCategoria(categoryId)}` : sql`true`;
  const [marcas, tamanos, colores, usos, terminaciones] = await Promise.all([
    sql<{ v: string }[]>`
      select distinct g.brand as v from public.product_parents g
      where ${donde} and g.active and g.brand is not null order by 1`,
    sql<{ v: string }[]>`
      select distinct p.size_label as v from public.products p
      join public.product_parents g on g.id = p.parent_id
      where ${donde} and p.active and p.size_label is not null`,
    sql<{ v: string; hex: string | null }[]>`
      select p.color as v, min(p.color_hex) as hex from public.products p
      join public.product_parents g on g.id = p.parent_id
      where ${donde} and p.active and p.color is not null group by p.color order by 1`,
    sql<{ v: ProductUsage }[]>`
      select distinct g.usage as v from public.product_parents g
      where ${donde} and g.active and g.usage is not null`,
    sql<{ v: string }[]>`
      select distinct g.finish as v from public.product_parents g
      where ${donde} and g.active and g.finish is not null order by 1`,
  ]);
  return {
    brands: marcas.map((m) => m.v),
    sizes: tamanos.map((t) => t.v).sort((a, b) => valorTamano(a) - valorTamano(b)),
    colors: colores.map((c) => ({ name: c.v, hex: c.hex ?? undefined })),
    usages: usos.map((u) => u.v),
    finishes: terminaciones.map((t) => t.v),
  };
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const filas = await sql<ProductRow[]>`
    select * from public.products where id = any(${ids}) and active`;
  return filas.map(aProducto);
}

export async function getProductsBySkus(skus: string[]): Promise<Product[]> {
  if (skus.length === 0) return [];
  const filas = await sql<ProductRow[]>`
    select * from public.products where lower(sku) = any(${skus.map((x) => x.toLowerCase())})`;
  return filas.map(aProducto);
}

export async function getProductById(id: string): Promise<Product | null> {
  const filas = await sql<ProductRow[]>`
    select * from public.products where id = ${id} limit 1`;
  return filas[0] ? aProducto(filas[0]) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const filas = await sql<ProductRow[]>`
    select * from public.products where slug = ${slug} limit 1`;
  return filas[0] ? aProducto(filas[0]) : null;
}

/**
 * Busca por código. Ignora mayúsculas, que es lo que necesita el matching del
 * Excel: en una planilla el mismo artículo aparece como "SIN-1020" o "sin-1020".
 * La comparación es contra `lower(sku)`, que es exactamente la expresión del
 * índice único, así que Postgres lo resuelve por índice y no leyendo la tabla.
 */
export async function getProductBySku(sku: string): Promise<Product | null> {
  const filas = await sql<ProductRow[]>`
    select * from public.products where lower(sku) = lower(${sku}) limit 1`;
  return filas[0] ? aProducto(filas[0]) : null;
}

/**
 * Alta o edición. Si `input.id` viene, edita; si no, crea.
 * Devuelve el producto ya guardado (con id, slug y timestamps resueltos).
 *
 * El id lo genera la base con una secuencia (p-034, p-035…), y `updated_at` lo
 * pone un trigger. Las dos cosas dejaron de ser responsabilidad de la app: no
 * hay forma de olvidarse.
 */
export async function upsertProduct(input: ProductInput): Promise<Product> {
  const guardado = await guardarProducto(input);
  // Un producto ACTIVO sin padre no aparecería en el catálogo (que lista
  // padres). Se le crea uno propio, de una sola variante; después se lo puede
  // mover a otro padre desde "Pendientes".
  if (guardado.active && !guardado.parentId) {
    await crearPadreDe(guardado.id);
    return (await getProductById(guardado.id)) ?? guardado;
  }
  return guardado;
}

/** Crea un padre con el nombre del producto y se lo asigna como única variante. */
async function crearPadreDe(productId: string): Promise<void> {
  const p = await getProductById(productId);
  if (!p) return;
  const slug = await slugLibre("product_parents", p.name);
  await sql.begin(async (tx) => {
    const [padre] = await tx`
      insert into public.product_parents (name, slug, brand, category_id, description, images)
      values (${p.name}, ${slug}, ${oNulo(p.brand)}, ${oNulo(p.categoryId)}, ${p.description},
              ${p.images}::text[])
      returning id`;
    await tx`update public.products set parent_id = ${padre.id} where id = ${productId}`;
  });
}

/** Códigos sin padre (por ejemplo, altas nuevas de una lista de precios). */
export async function getPendingProducts(): Promise<Product[]> {
  const filas = await sql<ProductRow[]>`
    select * from public.products where parent_id is null
    order by created_at desc, sku`;
  return filas.map(aProducto);
}

export async function getParentsForAdmin(): Promise<
  { id: string; name: string; categoryId: string; variants: number }[]
> {
  const filas = await sql<{ id: string; name: string; category_id: string | null; n: number }[]>`
    select g.id, g.name, g.category_id, count(p.id)::int as n
    from public.product_parents g left join public.products p on p.parent_id = g.id
    group by g.id order by public.immutable_unaccent(lower(g.name))`;
  return filas.map((f) => ({
    id: f.id,
    name: f.name,
    categoryId: f.category_id ?? "",
    variants: f.n,
  }));
}

/**
 * Asigna un código pendiente a un padre existente (con su color y tamaño), o
 * le crea un padre propio si `parentId` es null. Lo deja activo.
 */
export async function assignProductToParent(
  productId: string,
  datos: { parentId: string | null; color?: string; colorHex?: string; sizeLabel?: string },
): Promise<void> {
  if (datos.parentId === null) {
    await crearPadreDe(productId);
  } else {
    await sql`
      update public.products set
        parent_id = ${datos.parentId},
        color = ${oNulo(datos.color)},
        color_hex = ${oNulo(datos.colorHex)},
        size_label = ${oNulo(datos.sizeLabel)}
      where id = ${productId}`;
  }
  await sql`update public.products set active = true where id = ${productId}`;
}

export type ParentEdit = {
  id: string;
  description: string;
  usage: ProductUsage | null;
  finish: string | null;
  technical: TechnicalSheet;
};

export async function getParentById(id: string): Promise<ProductParent | null> {
  const filas = await sql<ParentRow[]>`select * from public.product_parents where id = ${id} limit 1`;
  if (!filas[0]) return null;
  const variantes = await sql<ProductRow[]>`select * from public.products where parent_id = ${id}`;
  return aPadre(filas[0], ordenarVariantes(variantes.map(aProducto)));
}

export async function updateParent(edit: ParentEdit): Promise<void> {
  await sql`
    update public.product_parents set
      description = ${edit.description},
      usage = ${edit.usage},
      finish = ${edit.finish},
      technical = ${sql.json(edit.technical as never)}
    where id = ${edit.id}`;
}

async function guardarProducto(input: ProductInput): Promise<Product> {
  if (input.id) {
    const previo = await getProductById(input.id);
    if (!previo) throw new Error(`No existe el producto ${input.id}`);

    // El slug solo se regenera si cambió el nombre. Si se regenerara siempre,
    // corregir una falta de ortografía rompería el link que un cliente guardó.
    const slug =
      input.name !== previo.name
        ? await slugLibre("products", input.name, input.id)
        : previo.slug;

    const filas = await sql<ProductRow[]>`
      update public.products set
        sku         = ${input.sku},
        name        = ${input.name},
        slug        = ${slug},
        description = ${input.description},
        price       = ${input.price},
        category_id = ${oNulo(input.categoryId)},
        brand       = ${oNulo(input.brand)},
        unit        = ${oNulo(input.unit)},
        stock       = ${input.stock ?? null},
        featured    = ${input.featured},
        active      = ${input.active},
        images      = ${input.images}::text[]
      where id = ${input.id}
      returning *`;

    return aProducto(filas[0]);
  }

  const filas = await sql<ProductRow[]>`
    insert into public.products
      (sku, name, slug, description, price, category_id, brand, unit, stock,
       featured, active, images)
    values (
      ${input.sku},
      ${input.name},
      ${await slugLibre("products", input.name)},
      ${input.description},
      ${input.price},
      ${oNulo(input.categoryId)},
      ${oNulo(input.brand)},
      ${oNulo(input.unit)},
      ${input.stock ?? null},
      ${input.featured},
      ${input.active},
      ${input.images}::text[]
    )
    returning *`;

  return aProducto(filas[0]);
}

/** Cambia solo el stock. 0 = agotado, null = no se controla. */
export async function setProductStock(id: string, stock: number | null): Promise<void> {
  const filas = await sql`update public.products set stock = ${stock} where id = ${id} returning id`;
  if (filas.length === 0) throw new Error(`No existe el producto ${id}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const filas = await sql`delete from public.products where id = ${id} returning id`;
  if (filas.length === 0) throw new Error(`No existe el producto ${id}`);
}

/* -------------------------------------------------------------------------- */
/* Categorías                                                                  */
/* -------------------------------------------------------------------------- */

export async function getCategories(): Promise<Category[]> {
  const filas = await sql<CategoryRow[]>`
    select * from public.categories
    order by sort_order, public.immutable_unaccent(lower(name))`;
  return filas.map(aCategoria);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const filas = await sql<CategoryRow[]>`
    select * from public.categories where id = ${id} limit 1`;
  return filas[0] ? aCategoria(filas[0]) : null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const filas = await sql<CategoryRow[]>`
    select * from public.categories where slug = ${slug} limit 1`;
  return filas[0] ? aCategoria(filas[0]) : null;
}

/**
 * Categorías + cuántos productos tiene cada una. Lo usa el panel.
 *
 * `left join` y no `join`: una categoría recién creada, todavía sin productos,
 * tiene que aparecer igual con un 0 al lado. Con un join común desaparecería.
 */
export async function getCategoriesWithCount(): Promise<
  Array<Category & { productCount: number }>
> {
  const filas = await sql<Array<CategoryRow & { product_count: string }>>`
    select c.*, count(p.id) as product_count
    from public.categories c
    left join public.products p on p.category_id = c.id
    group by c.id
    order by c.sort_order, public.immutable_unaccent(lower(c.name))`;

  // count() también es numeric: llega como texto, igual que los precios.
  return filas.map((f) => ({ ...aCategoria(f), productCount: Number(f.product_count) }));
}

export async function upsertCategory(input: CategoryInput): Promise<Category> {
  if (input.id) {
    const previo = await getCategoryById(input.id);
    if (!previo) throw new Error(`No existe la categoría ${input.id}`);

    const slug =
      input.name !== previo.name
        ? await slugLibre("categories", input.name, input.id)
        : previo.slug;

    const filas = await sql<CategoryRow[]>`
      update public.categories set
        name        = ${input.name},
        slug        = ${slug},
        description = ${oNulo(input.description)},
        image       = ${oNulo(input.image)},
        sort_order  = ${input.order}
      where id = ${input.id}
      returning *`;

    return aCategoria(filas[0]);
  }

  const filas = await sql<CategoryRow[]>`
    insert into public.categories (name, slug, description, image, sort_order)
    values (
      ${input.name},
      ${await slugLibre("categories", input.slug || input.name)},
      ${oNulo(input.description)},
      ${oNulo(input.image)},
      ${input.order}
    )
    returning *`;

  return aCategoria(filas[0]);
}

/**
 * Borra una categoría.
 *
 * Si tiene productos asociados, no borra nada y devuelve `{ ok: false }` con la
 * cantidad, para que la UI pueda pedir confirmación. Con
 * `{ reassignTo: "c-002" }` mueve los productos a otra categoría antes de
 * borrar; con `{ reassignTo: "" }` los deja "sin categoría".
 *
 * Va adentro de una transacción (`sql.begin`): mover los productos y borrar la
 * categoría son dos pasos que tienen que pasar los dos o ninguno. Si el segundo
 * fallara, la base deshace el primero sola. Esto es lo que con archivos JSON
 * había que resolver a mano con una cola de escrituras.
 */
export async function deleteCategory(
  id: string,
  options: { reassignTo?: string } = {},
): Promise<{ ok: true } | { ok: false; productCount: number }> {
  return sql.begin(async (tx) => {
    const [{ count }] = await tx<{ count: string }[]>`
      select count(*) from public.products where category_id = ${id}`;
    const afectados = Number(count);

    if (afectados > 0 && options.reassignTo === undefined) {
      return { ok: false as const, productCount: afectados };
    }

    if (afectados > 0) {
      await tx`
        update public.products
        set category_id = ${oNulo(options.reassignTo)}
        where category_id = ${id}`;
    }

    await tx`delete from public.categories where id = ${id}`;
    return { ok: true as const };
  });
}

/* -------------------------------------------------------------------------- */
/* Configuración de la tienda                                                  */
/* -------------------------------------------------------------------------- */

export async function getStoreConfig(): Promise<StoreConfig> {
  const filas = await sql<StoreConfigRow[]>`
    select * from public.store_config where id = 1`;
  if (!filas[0]) {
    throw new Error(
      "No hay configuración de tienda en la base. ¿Se aplicaron las migraciones " +
        "de supabase/migrations/?",
    );
  }
  return aConfig(filas[0]);
}

/**
 * Guarda cambios parciales. Lee la fila, la mezcla en memoria y la escribe
 * entera.
 *
 * Es una fila sola que toca una persona cada tanto desde el panel, así que no
 * hay nada que ganar armando un UPDATE con solo los campos que cambiaron. Y
 * leer-mezclar-escribir mantiene exactamente el comportamiento anterior,
 * incluida la mezcla campo por campo de `contact` y `colors`: mandar solo el
 * teléfono no borra la dirección.
 */
export async function updateStoreConfig(
  partial: Partial<StoreConfig>,
): Promise<StoreConfig> {
  const actual = await getStoreConfig();
  const nuevo: StoreConfig = {
    ...actual,
    ...partial,
    contact: { ...actual.contact, ...partial.contact },
    colors: { ...actual.colors, ...partial.colors },
  };

  const filas = await sql<StoreConfigRow[]>`
    update public.store_config set
      store_name      = ${nuevo.storeName},
      logo_text       = ${nuevo.logoText},
      logo_image      = ${oNulo(nuevo.logoImage)},
      whatsapp_number = ${nuevo.whatsappNumber},
      welcome_title   = ${nuevo.welcomeTitle},
      welcome_text    = ${nuevo.welcomeText},
      contact         = ${sql.json(nuevo.contact)},
      colors          = ${sql.json(nuevo.colors)}
    where id = 1
    returning *`;

  return aConfig(filas[0]);
}

/* -------------------------------------------------------------------------- */
/* Actualización masiva de precios (carga por Excel)                           */
/* -------------------------------------------------------------------------- */

export type PriceUpdate = { sku: string; price: number };

export type NewProductFromPriceList = {
  sku: string;
  name: string;
  price: number;
  categoryId?: string;
};

/**
 * Aplica de una sola pasada los cambios de precio confirmados en la preview, y
 * opcionalmente da de alta los productos nuevos.
 *
 * Todo adentro de una transacción: una lista de precios se aplica entera o no
 * se aplica. Quedarse a mitad de camino es el peor final posible, porque nadie
 * sabría desde qué fila hay que retomar.
 */
export async function updatePriceList(
  updates: PriceUpdate[],
  newProducts: NewProductFromPriceList[] = [],
): Promise<{ updated: number; created: number }> {
  return sql.begin(async (tx) => {
    let updated = 0;

    if (updates.length > 0) {
      // Un solo UPDATE para las N filas, en vez de N consultas.
      //
      // `unnest` toma dos arrays —los códigos y los precios— y los abre como si
      // fueran una tabla de dos columnas, contra la que se hace el join. Los
      // precios viajan como texto para que Postgres los lea como `numeric`
      // exacto y no como un decimal aproximado.
      const codigos = updates.map((u) => u.sku);
      const precios = updates.map((u) => String(u.price));

      const cambiadas = await tx`
        update public.products p
        set price = lote.precio
        from unnest(${codigos}::text[], ${precios}::numeric[]) as lote(codigo, precio)
        where lower(p.sku) = lower(lote.codigo)
          -- Si el precio ya era ese, no se toca: así updated_at no cambia y
          -- el conteo que ve el usuario refleja los cambios de verdad.
          and p.price is distinct from lote.precio
        returning p.id`;

      updated = cambiadas.length;
    }

    let created = 0;

    if (newProducts.length > 0) {
      // Los slugs tienen que ser únicos entre sí y contra los que ya existen,
      // así que se piden una vez y se van reservando a medida que se arma el lote.
      const existentes = await tx<{ slug: string }[]>`select slug from public.products`;
      const slugs = existentes.map((f) => f.slug);

      const filas = newProducts.map((nuevo) => {
        const slug = uniqueSlug(nuevo.name, slugs);
        slugs.push(slug);
        return {
          sku: nuevo.sku,
          name: nuevo.name,
          slug,
          description: "",
          price: nuevo.price,
          category_id: oNulo(nuevo.categoryId),
          featured: false,
          // Se crean INACTIVOS a propósito: sin descripción ni foto no deberían
          // salir al catálogo hasta que alguien los complete.
          active: false,
        };
      });

      // `on conflict (lower(sku)) do nothing`: si el código ya existía, se
      // saltea esa fila en silencio en vez de romper el lote entero.
      // `returning` solo devuelve las que se insertaron de verdad, así que
      // contarlas da el número exacto de altas.
      const insertadas = await tx`
        insert into public.products ${tx(
          filas,
          "sku",
          "name",
          "slug",
          "description",
          "price",
          "category_id",
          "featured",
          "active",
        )}
        on conflict (lower(sku)) do nothing
        returning id`;

      created = insertadas.length;
    }

    return { updated, created };
  });
}

/* -------------------------------------------------------------------------- */
/* Usuarios                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Quiénes pueden iniciar sesión.
 *
 * Las cuentas y las contraseñas las maneja **Supabase Auth**, en el esquema
 * `auth`, que administra el propio Supabase. Esta app no guarda contraseñas ni
 * las ve nunca.
 *
 * Lo que Supabase Auth no sabe es si alguien es admin o cliente: eso es una idea
 * de esta aplicación. Vive en `public.profiles`, una fila por cuenta, con el
 * mismo id. Las funciones de acá leen y escriben esa tabla.
 *
 * Dar de ALTA una cuenta no está acá sino en `src/lib/supabase/admin.ts`: es una
 * llamada a la API de Auth, no una consulta SQL.
 */

type ProfileRow = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

function aUsuario(r: ProfileRow): AppUser {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    active: r.active,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

/**
 * El perfil de una cuenta. `null` si no existe.
 *
 * La llama `getSession()` en cada request del servidor para resolver el rol, así
 * que es la consulta más frecuente de este bloque: va por clave primaria.
 */
export async function getUserById(id: string): Promise<AppUser | null> {
  const filas = await sql<ProfileRow[]>`
    select * from public.profiles where id = ${id} limit 1`;
  return filas[0] ? aUsuario(filas[0]) : null;
}

/** Busca por email, ignorando mayúsculas. La usa el alta, para no duplicar. */
export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const filas = await sql<ProfileRow[]>`
    select * from public.profiles where lower(email) = lower(${email}) limit 1`;
  return filas[0] ? aUsuario(filas[0]) : null;
}

/** Todas las cuentas, para la pantalla del panel. Los admin primero. */
export async function listUsers(): Promise<AppUser[]> {
  const filas = await sql<ProfileRow[]>`
    select * from public.profiles
    order by (role = 'admin') desc, lower(email)`;
  return filas.map(aUsuario);
}

/**
 * Le pone el rol al perfil de una cuenta recién creada.
 *
 * El perfil ya existe: lo creó solo el trigger `on_auth_user_created` cuando
 * nació la cuenta, con rol "cliente". Esto solo lo corrige si hacía falta otro.
 */
export async function setUserRole(id: string, role: Role): Promise<void> {
  const filas = await sql`
    update public.profiles set role = ${role} where id = ${id} returning id`;
  if (filas.length === 0) throw new Error(`No existe el perfil ${id}`);
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  const filas = await sql`
    update public.profiles set active = ${active} where id = ${id} returning id`;
  if (filas.length === 0) throw new Error(`No existe el perfil ${id}`);
}

/**
 * Marca el email como confirmado.
 *
 * Cuando un admin da de alta a alguien desde el panel no tiene sentido hacerlo
 * esperar un mail de confirmación: el alta ya la hizo una persona de confianza.
 * Se actualiza una fecha, no se inventa ninguna fila.
 */
export async function confirmUserEmail(id: string): Promise<void> {
  await sql`
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = ${id}`;
}

/**
 * Borra la cuenta entera.
 *
 * Se borra de `auth.users`, no de `profiles`: el perfil se va solo detrás, por
 * el `on delete cascade` de la clave foránea. Al revés quedaría una cuenta que
 * puede iniciar sesión pero no tiene rol, que es peor que no existir.
 */
export async function deleteUser(id: string): Promise<void> {
  const filas = await sql`delete from auth.users where id = ${id} returning id`;
  if (filas.length === 0) throw new Error(`No existe el usuario ${id}`);
}

/**
 * Cuántos admin activos hay, sin contar a uno.
 *
 * Es la consulta que evita el peor final posible del panel: quedarse sin ningún
 * admin y no poder volver a entrar más que por la terminal. Se pregunta "cuántos
 * quedarían si saco a este", por eso el parámetro para excluirlo.
 */
export async function countActiveAdmins(exceptId?: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*) from public.profiles
    where role = 'admin' and active
      and id is distinct from ${exceptId ?? null}`;
  return Number(count);
}

/* -------------------------------------------------------------------------- */
/* Contraseña compartida de clientes e intentos de login                       */
/* -------------------------------------------------------------------------- */

/**
 * Cambia la contraseña de una cuenta de Supabase Auth y cierra sus sesiones.
 *
 * La API de administración de Supabase lo haría, pero pide la clave secreta del
 * proyecto, que acá no se usa. Se escribe el hash bcrypt directo en
 * `auth.users`, que es el mismo formato que guarda Supabase (mismo costo 10).
 * Es lo que hace `scripts/cambiar-password.mjs`.
 *
 * Cerrar las sesiones va en la misma transacción: si cambiara la clave y
 * fallara el cierre, quedarían sesiones vivas con la clave vieja. Para una
 * cuenta compartida es justo lo que se busca al cambiarla: que quien tenía la
 * anterior quede afuera.
 *
 * Devuelve `false` si no hay ninguna cuenta con ese email.
 */
export async function setAuthPasswordByEmail(
  email: string,
  password: string,
): Promise<boolean> {
  return sql.begin(async (tx) => {
    const filas = await tx`
      update auth.users
      set encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf', 10)),
          updated_at = now()
      where lower(email) = lower(${email})
      returning id`;
    if (filas.length === 0) return false;

    const id = filas[0].id as string;
    await tx`delete from auth.refresh_tokens where user_id = ${id}::text`;
    await tx`delete from auth.sessions where user_id = ${id}`;
    return true;
  });
}

/** Cuántos intentos fallidos tuvo esta IP en los últimos `minutos`. */
export async function countLoginFailures(
  ip: string,
  minutos: number,
): Promise<number> {
  const filas = await sql<{ n: number }[]>`
    select count(*)::int as n
    from public.login_intentos
    where ip = ${ip}
      and creado_en > now() - make_interval(mins => ${minutos})`;
  return filas[0]?.n ?? 0;
}

/** Anota un intento fallido y, de paso, borra los de más de un día. */
export async function recordLoginFailure(ip: string): Promise<void> {
  await sql`insert into public.login_intentos (ip) values (${ip})`;
  await sql`delete from public.login_intentos where creado_en < now() - interval '1 day'`;
}

/** Perdona los intentos de esta IP: se llama cuando entra bien. */
export async function clearLoginFailures(ip: string): Promise<void> {
  await sql`delete from public.login_intentos where ip = ${ip}`;
}
