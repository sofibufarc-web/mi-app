-- ============================================================================
-- Esquema inicial de la tienda Wiedmer.
--
-- Refleja exactamente los tipos de src/data/types.ts. Las columnas van en
-- snake_case (convención de Postgres) y src/lib/data-source.ts las traduce a
-- camelCase, que es lo que espera el resto de la app.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Extensiones para el buscador
-- ---------------------------------------------------------------------------
-- unaccent: saca las tildes ("látex" -> "latex").
-- pg_trgm:  permite indexar búsquedas por "contiene" (ILIKE '%algo%'). Sin
--           esto, Postgres tendría que leer la tabla entera en cada búsqueda.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() viene marcada como STABLE, no IMMUTABLE, porque en teoría alguien
-- podría editar el diccionario de acentos en caliente. Postgres solo acepta
-- funciones IMMUTABLE dentro de una columna generada, así que la envolvemos en
-- una función propia que sí lo declara. Es el atajo estándar: en la práctica
-- nadie toca ese diccionario.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;


-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
-- Antes la fecha la ponía la app en cada escritura. Ahora la pone la base: es
-- imposible olvidarse, y no depende del reloj del servidor que corra Next.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------
-- Los ids siguen el formato "c-001" que ya usaban los JSON, para no romper
-- ninguna URL ni referencia existente. Una secuencia los genera sola.
create sequence public.categories_id_seq;

create table public.categories (
  id          text primary key
              default 'c-' || lpad(nextval('public.categories_id_seq')::text, 3, '0'),
  name        text not null,
  slug        text not null unique,
  description text,
  image       text,
  -- "order" es palabra reservada de SQL. Se llama sort_order para no tener que
  -- escribirla entre comillas en cada consulta.
  sort_order  integer not null default 0
);

create index categories_sort_order_idx on public.categories (sort_order, name);


-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
create sequence public.products_id_seq;

create table public.products (
  id          text primary key
              default 'p-' || lpad(nextval('public.products_id_seq')::text, 3, '0'),
  sku         text not null,
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  -- numeric y no float: con dinero, 0.1 + 0.2 tiene que dar 0.3 exacto.
  price       numeric(12, 2) not null default 0 check (price >= 0),
  -- NULL = "sin categoría" (en los JSON era la cadena vacía). Si se borra una
  -- categoría, sus productos quedan sin categoría en vez de desaparecer.
  category_id text references public.categories (id) on delete set null,
  brand       text,
  unit        text,
  -- NULL = no se controla stock para este artículo.
  stock       integer,
  featured    boolean not null default false,
  active      boolean not null default true,
  images      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- El SKU es la clave con la que la carga de Excel encuentra cada artículo.
-- El índice es sobre lower(sku) porque el matching ignora mayúsculas: así
-- "sin-1020" y "SIN-1020" no pueden convivir como dos productos distintos.
create unique index products_sku_key on public.products (lower(sku));

create index products_category_id_idx on public.products (category_id);
create index products_active_idx      on public.products (active) where active;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Buscador
-- ---------------------------------------------------------------------------
-- Columna calculada por la base: junta los cuatro campos donde busca el sitio,
-- en minúsculas y sin tildes. "generated always as ... stored" significa que se
-- recalcula sola en cada insert/update y se guarda; nunca puede quedar
-- desincronizada del producto.
alter table public.products
  add column search_text text
  generated always as (
    public.immutable_unaccent(
      lower(
        name || ' ' || sku || ' ' || description || ' ' || coalesce(brand, '')
      )
    )
  ) stored;

create index products_search_idx
  on public.products using gin (search_text extensions.gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- Configuración de la tienda
-- ---------------------------------------------------------------------------
-- Una sola fila, siempre. El check sobre el id lo garantiza: cualquier intento
-- de insertar una segunda fila falla en la base, no depende de la app.
create table public.store_config (
  id              integer primary key default 1 check (id = 1),
  store_name      text not null,
  logo_text       text not null,
  logo_image      text,
  whatsapp_number text not null,
  welcome_title   text not null,
  welcome_text    text not null,
  -- contact y colors son objetos anidados en el tipo StoreConfig. Guardarlos
  -- como jsonb mantiene esa forma y evita ocho columnas sueltas.
  contact         jsonb not null,
  colors          jsonb not null,
  updated_at      timestamptz not null default now()
);

create trigger store_config_set_updated_at
  before update on public.store_config
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Seguridad: nadie entra por la puerta pública
-- ---------------------------------------------------------------------------
-- La clave NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY viaja al navegador: es pública
-- por diseño. Si le diéramos permiso de lectura sobre products, cualquiera
-- podría copiarla del inspector y bajarse la lista de precios entera. Eso
-- anularía el muro de precios.
--
-- Por eso: RLS activo y CERO políticas. Sin política que lo permita, RLS niega
-- todo. Los roles anon y authenticated no pueden leer ni escribir nada.
--
-- La app entra con la clave secreta (SUPABASE_SECRET_KEY), que corresponde al
-- rol service_role y saltea RLS por definición. Esa clave vive solo en el
-- servidor: src/lib/data-source.ts tiene `import "server-only"`, así que el
-- build falla si alguien la arrastra al navegador por accidente.
alter table public.categories   enable row level security;
alter table public.products     enable row level security;
alter table public.store_config enable row level security;

-- RLS ya alcanza. Revocar los permisos de tabla es la segunda cerradura: aunque
-- mañana alguien agregue una política por error, sigue sin haber permiso.
revoke all on public.categories   from anon, authenticated;
revoke all on public.products     from anon, authenticated;
revoke all on public.store_config from anon, authenticated;
