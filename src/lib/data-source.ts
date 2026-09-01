import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  Category,
  CategoryInput,
  Product,
  ProductFilters,
  ProductInput,
  StoreConfig,
} from "@/data/types";
import { normalizeText, uniqueSlug } from "@/lib/slug";

/**
 * ★ CAPA DE ACCESO A DATOS ★
 * ---------------------------------------------------------------------------
 * Este es el ÚNICO archivo de la app que sabe de dónde salen los datos.
 * Páginas, componentes y route handlers importan de acá y nunca tocan `fs`
 * ni los .json directamente.
 *
 * HOY: archivos JSON en `src/data/`, leídos y escritos con `fs`.
 * MAÑANA: Supabase. Cada función tiene un comentario `// TODO(supabase):` con
 * el reemplazo concreto. Al migrar hay que cambiar SOLO el cuerpo de estas
 * funciones; las firmas y los tipos quedan igual, así que el resto de la app
 * no se entera.
 *
 * Pasos de la migración:
 *   1. `npm i @supabase/supabase-js`
 *   2. Crear `src/lib/supabase.ts` con el cliente (URL y key desde .env).
 *   3. Crear las tablas `products`, `categories`, `store_config` respetando
 *      `src/data/types.ts`.
 *   4. Reemplazar los cuerpos de abajo y borrar `readJson` / `writeJson`.
 *
 * `import "server-only"` hace que el build falle si alguien importa este
 * módulo desde un Client Component. Es una red de seguridad: evita filtrar
 * lógica de servidor (y datos) al navegador.
 *
 * ⚠️ VERCEL: las escrituras usan el filesystem, que allá es efímero y de solo
 * lectura. En local anda perfecto; en Vercel los cambios del panel se pierden.
 * Se resuelve con Supabase.
 */

const DATA_DIR = path.join(process.cwd(), "src", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const STORE_CONFIG_FILE = path.join(DATA_DIR, "store-config.json");

/* -------------------------------------------------------------------------- */
/* Helpers de archivo (desaparecen al migrar a Supabase)                       */
/* -------------------------------------------------------------------------- */

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Cola de escrituras: encadena todas las escrituras en una sola promesa para
 * que dos requests simultáneos no pisen el archivo a la vez. Es la versión
 * mínima de un "lock"; con una base de datos real esto lo resuelve el motor.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  // Evita que un error en una escritura rompa la cola para las siguientes.
  writeQueue = next.catch(() => undefined);
  return next;
}

async function writeJson(file: string, data: unknown): Promise<void> {
  // Escritura atómica: escribimos un archivo temporal y después lo renombramos.
  // Si el proceso muere a mitad de camino, el archivo original queda intacto.
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

/** Genera el próximo id con prefijo: p-001, p-002… */
function nextId(prefix: string, existing: string[]): string {
  const numbers = existing
    .map((id) => Number.parseInt(id.replace(`${prefix}-`, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

async function readProducts(): Promise<Product[]> {
  return readJson<Product[]>(PRODUCTS_FILE);
}

/**
 * Devuelve productos con filtros opcionales.
 *
 * Importante: `onlyActive` NO viene en true por defecto. El catálogo público
 * tiene que pedirlo explícitamente; el panel necesita ver también los inactivos.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  // TODO(supabase): let query = supabase.from("products").select("*")
  //   y traducir cada filtro a .eq() / .ilike() / .order()
  let items = await readProducts();

  if (filters.onlyActive) {
    items = items.filter((p) => p.active);
  }

  if (filters.categorySlug) {
    const category = await getCategoryBySlug(filters.categorySlug);
    items = category ? items.filter((p) => p.categoryId === category.id) : [];
  }

  if (filters.categoryId !== undefined && filters.categoryId !== "") {
    items = items.filter((p) => p.categoryId === filters.categoryId);
  }

  if (filters.featured !== undefined) {
    items = items.filter((p) => p.featured === filters.featured);
  }

  if (filters.search) {
    const q = normalizeText(filters.search);
    items = items.filter((p) =>
      [p.name, p.sku, p.description, p.brand ?? ""]
        .map(normalizeText)
        .some((field) => field.includes(q)),
    );
  }

  if (typeof filters.minPrice === "number") {
    items = items.filter((p) => p.price >= filters.minPrice!);
  }
  if (typeof filters.maxPrice === "number") {
    items = items.filter((p) => p.price <= filters.maxPrice!);
  }

  switch (filters.sort) {
    case "precio-asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "precio-desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "recientes":
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
    default:
      items.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  return items;
}

export async function getProductById(id: string): Promise<Product | null> {
  // TODO(supabase): supabase.from("products").select("*").eq("id", id).maybeSingle()
  const items = await readProducts();
  return items.find((p) => p.id === id) ?? null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // TODO(supabase): .eq("slug", slug).maybeSingle()
  const items = await readProducts();
  return items.find((p) => p.slug === slug) ?? null;
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  const items = await readProducts();
  const target = normalizeText(sku);
  return items.find((p) => normalizeText(p.sku) === target) ?? null;
}

/**
 * Alta o edición. Si `input.id` viene, edita; si no, crea.
 * Devuelve el producto ya guardado (con id, slug y timestamps resueltos).
 */
export async function upsertProduct(input: ProductInput): Promise<Product> {
  // TODO(supabase): supabase.from("products").upsert(row).select().single()
  return enqueueWrite(async () => {
    const items = await readProducts();
    const now = new Date().toISOString();

    if (input.id) {
      const index = items.findIndex((p) => p.id === input.id);
      if (index === -1) throw new Error(`No existe el producto ${input.id}`);

      const previous = items[index];
      const otherSlugs = items.filter((p) => p.id !== input.id).map((p) => p.slug);

      const updated: Product = {
        ...previous,
        ...input,
        id: previous.id,
        // Si cambió el nombre, regeneramos el slug (y evitamos duplicados).
        slug:
          input.name !== previous.name
            ? uniqueSlug(input.name, otherSlugs)
            : previous.slug,
        createdAt: previous.createdAt,
        updatedAt: now,
      };

      items[index] = updated;
      await writeJson(PRODUCTS_FILE, items);
      return updated;
    }

    const created: Product = {
      ...input,
      id: nextId("p", items.map((p) => p.id)),
      slug: uniqueSlug(input.name, items.map((p) => p.slug)),
      createdAt: now,
      updatedAt: now,
    };

    items.push(created);
    await writeJson(PRODUCTS_FILE, items);
    return created;
  });
}

export async function deleteProduct(id: string): Promise<void> {
  // TODO(supabase): supabase.from("products").delete().eq("id", id)
  await enqueueWrite(async () => {
    const items = await readProducts();
    const next = items.filter((p) => p.id !== id);
    if (next.length === items.length) throw new Error(`No existe el producto ${id}`);
    await writeJson(PRODUCTS_FILE, next);
  });
}

/* -------------------------------------------------------------------------- */
/* Categorías                                                                  */
/* -------------------------------------------------------------------------- */

async function readCategories(): Promise<Category[]> {
  return readJson<Category[]>(CATEGORIES_FILE);
}

export async function getCategories(): Promise<Category[]> {
  // TODO(supabase): supabase.from("categories").select("*").order("order")
  const items = await readCategories();
  return items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const items = await readCategories();
  return items.find((c) => c.id === id) ?? null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const items = await readCategories();
  return items.find((c) => c.slug === slug) ?? null;
}

/** Categorías + cuántos productos tiene cada una. Lo usa el panel. */
export async function getCategoriesWithCount(): Promise<
  Array<Category & { productCount: number }>
> {
  const [categories, products] = await Promise.all([getCategories(), readProducts()]);
  return categories.map((c) => ({
    ...c,
    productCount: products.filter((p) => p.categoryId === c.id).length,
  }));
}

export async function upsertCategory(input: CategoryInput): Promise<Category> {
  // TODO(supabase): supabase.from("categories").upsert(row).select().single()
  return enqueueWrite(async () => {
    const items = await readCategories();

    if (input.id) {
      const index = items.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error(`No existe la categoría ${input.id}`);

      const previous = items[index];
      const otherSlugs = items.filter((c) => c.id !== input.id).map((c) => c.slug);

      const updated: Category = {
        ...previous,
        ...input,
        id: previous.id,
        slug:
          input.name !== previous.name
            ? uniqueSlug(input.name, otherSlugs)
            : previous.slug,
      };

      items[index] = updated;
      await writeJson(CATEGORIES_FILE, items);
      return updated;
    }

    const created: Category = {
      ...input,
      id: nextId("c", items.map((c) => c.id)),
      slug: uniqueSlug(input.slug || input.name, items.map((c) => c.slug)),
    };

    items.push(created);
    await writeJson(CATEGORIES_FILE, items);
    return created;
  });
}

/**
 * Borra una categoría.
 *
 * Si tiene productos asociados, no borra nada y devuelve `{ ok: false }` con la
 * cantidad, para que la UI pueda pedir confirmación. Con
 * `{ reassignTo: "c-002" }` mueve los productos a otra categoría antes de
 * borrar; con `{ reassignTo: "" }` los deja "sin categoría".
 */
export async function deleteCategory(
  id: string,
  options: { reassignTo?: string } = {},
): Promise<{ ok: true } | { ok: false; productCount: number }> {
  // TODO(supabase): hacerlo en una transacción (update de products + delete de category)
  return enqueueWrite(async () => {
    const [categories, products] = await Promise.all([readCategories(), readProducts()]);
    const affected = products.filter((p) => p.categoryId === id);

    if (affected.length > 0 && options.reassignTo === undefined) {
      return { ok: false as const, productCount: affected.length };
    }

    if (affected.length > 0) {
      const target = options.reassignTo ?? "";
      const now = new Date().toISOString();
      const updatedProducts = products.map((p) =>
        p.categoryId === id ? { ...p, categoryId: target, updatedAt: now } : p,
      );
      await writeJson(PRODUCTS_FILE, updatedProducts);
    }

    await writeJson(
      CATEGORIES_FILE,
      categories.filter((c) => c.id !== id),
    );
    return { ok: true as const };
  });
}

/* -------------------------------------------------------------------------- */
/* Configuración de la tienda                                                  */
/* -------------------------------------------------------------------------- */

export async function getStoreConfig(): Promise<StoreConfig> {
  // TODO(supabase): supabase.from("store_config").select("*").single()
  return readJson<StoreConfig>(STORE_CONFIG_FILE);
}

export async function updateStoreConfig(
  partial: Partial<StoreConfig>,
): Promise<StoreConfig> {
  // TODO(supabase): supabase.from("store_config").update(partial).eq("id", 1)
  return enqueueWrite(async () => {
    const current = await readJson<StoreConfig>(STORE_CONFIG_FILE);
    const updated: StoreConfig = {
      ...current,
      ...partial,
      contact: { ...current.contact, ...partial.contact },
      colors: { ...current.colors, ...partial.colors },
    };
    await writeJson(STORE_CONFIG_FILE, updated);
    return updated;
  });
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
 * Aplica de una sola pasada los cambios de precio confirmados en la preview,
 * y opcionalmente da de alta los productos nuevos.
 *
 * Una sola escritura para todo el lote: es mucho más rápido y evita dejar el
 * archivo a medio actualizar si algo falla en el medio.
 */
export async function updatePriceList(
  updates: PriceUpdate[],
  newProducts: NewProductFromPriceList[] = [],
): Promise<{ updated: number; created: number }> {
  // TODO(supabase): un solo .upsert([...]) con onConflict: "sku"
  return enqueueWrite(async () => {
    const items = await readProducts();
    const now = new Date().toISOString();

    // Índice por SKU normalizado para no recorrer el array por cada fila.
    const bySku = new Map(items.map((p, i) => [normalizeText(p.sku), i]));

    let updated = 0;
    for (const { sku, price } of updates) {
      const index = bySku.get(normalizeText(sku));
      if (index === undefined) continue;
      if (items[index].price === price) continue;
      items[index] = { ...items[index], price, updatedAt: now };
      updated++;
    }

    let created = 0;
    const slugs = items.map((p) => p.slug);
    const ids = items.map((p) => p.id);

    for (const nuevo of newProducts) {
      if (bySku.has(normalizeText(nuevo.sku))) continue; // ya existe, no duplicar

      const id = nextId("p", ids);
      const slug = uniqueSlug(nuevo.name, slugs);
      ids.push(id);
      slugs.push(slug);

      items.push({
        id,
        sku: nuevo.sku,
        name: nuevo.name,
        slug,
        description: "",
        price: nuevo.price,
        categoryId: nuevo.categoryId ?? "",
        stock: null,
        featured: false,
        // Se crean INACTIVOS a propósito: sin descripción ni foto no deberían
        // salir al catálogo hasta que alguien los complete.
        active: false,
        images: [],
        createdAt: now,
        updatedAt: now,
      });
      bySku.set(normalizeText(nuevo.sku), items.length - 1);
      created++;
    }

    await writeJson(PRODUCTS_FILE, items);
    return { updated, created };
  });
}
