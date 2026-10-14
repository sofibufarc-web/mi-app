-- ---------------------------------------------------------------------------
-- Producto padre + variantes
-- ---------------------------------------------------------------------------
-- Cada fila de `products` YA es una variante: tiene su código, precio y stock.
-- Lo que faltaba era agruparlas: "Esmalte Sintético Doble B" es un producto y
-- sus colores y tamaños son variantes. Por eso esta migración SOLO AGREGA:
-- una tabla de padres y tres columnas nuevas en `products`. No se borra ni se
-- cambia nada existente, así que la lista de precios sigue importándose por
-- código exactamente igual.

create sequence public.product_parents_id_seq;

create table public.product_parents (
  id          text primary key
              default 'g-' || lpad(nextval('public.product_parents_id_seq')::text, 3, '0'),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  brand       text,
  category_id text references public.categories (id) on delete set null,
  -- 'interior' | 'exterior' | 'ambos' | NULL (no aplica)
  usage       text check (usage in ('interior', 'exterior', 'ambos')),
  finish      text,
  images      text[] not null default '{}',
  -- Carpeta técnica, cargada una vez por padre y válida para todas sus
  -- variantes. Forma:
  --   { "datos": [{ "label": "Rendimiento", "value": "10-12 m²/lt" }],
  --     "uso":   ["Lijar la superficie", "..."],
  --     "documentos": [{ "label": "Ficha técnica", "url": "https://..." }],
  --     "complementarios": ["p-001", "p-002"] }
  technical   jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index product_parents_category_idx on public.product_parents (category_id);

create trigger product_parents_set_updated_at
  before update on public.product_parents
  for each row execute function public.set_updated_at();

-- NULL = "pendiente de asignar" (por ejemplo, un código nuevo que llegó en una
-- lista de precios y todavía no se sabe a qué producto pertenece).
alter table public.products
  add column parent_id  text references public.product_parents (id) on delete set null,
  add column color      text,
  add column color_hex  text,
  add column size_label text;

create index products_parent_idx on public.products (parent_id);

-- Misma regla de seguridad que el resto: RLS activo y CERO políticas. La app
-- entra por la conexión directa del dueño de las tablas.
alter table public.product_parents enable row level security;
