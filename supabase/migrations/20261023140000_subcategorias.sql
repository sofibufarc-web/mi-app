-- ---------------------------------------------------------------------------
-- Subcategorías
-- ---------------------------------------------------------------------------
-- Una categoría puede colgar de otra ("Lijas" dentro de "Doble A"). Solo se
-- agrega una columna: los productos siguen apuntando a su categoría de
-- siempre, y la categoría padre los muestra sumando las de sus hijas.
-- Un solo nivel de profundidad: la app no arma árboles más hondos.

alter table public.categories
  add column parent_id text references public.categories (id) on delete set null;

create index categories_parent_idx on public.categories (parent_id);
