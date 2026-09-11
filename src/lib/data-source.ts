import "server-only";

import type {
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
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
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
  tabla: "products" | "categories",
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
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
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

  const donde = condiciones.length
    ? condiciones.reduce((acumulado, actual) => sql`${acumulado} and ${actual}`)
    : sql`true`;

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
    order by ${orden}`;

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
