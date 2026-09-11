-- Ids de más de tres dígitos
--
-- El problema: el id por defecto era
--
--     'p-' || lpad(nextval('products_id_seq')::text, 3, '0')
--
-- y `lpad` no solo rellena, también RECORTA cuando el texto es más largo que el
-- ancho pedido. Con menos de 1000 productos nunca se nota. Al insertar el
-- número 1000, `lpad('1000', 3, '0')` devuelve '100' y ese id ya lo tenía el
-- producto 100: el alta falla con "duplicate key".
--
-- Apareció al cargar la lista real del proveedor, que trae 1230 artículos.
--
-- La solución es rellenar solo mientras haga falta y dejar pasar el número
-- entero cuando ya tiene cuatro dígitos o más. Como `nextval` avanza la
-- secuencia cada vez que se lo llama, no puede escribirse dos veces en la misma
-- expresión; por eso va adentro de una función, que lo llama una sola vez.

create or replace function public.nuevo_id(prefijo text, secuencia regclass)
  returns text
  language sql
  volatile
as $$
  select prefijo || case
           when v < 1000 then lpad(v::text, 3, '0')
           else v::text
         end
  from (select nextval(secuencia) as v) s;
$$;

comment on function public.nuevo_id(text, regclass) is
  'Id legible tipo p-001 / p-1230. Rellena con ceros hasta tres dígitos y a partir de ahí deja el número entero.';

alter table public.products
  alter column id set default public.nuevo_id('p-', 'public.products_id_seq');

-- Misma corrección para categorías. Hoy son ocho y el techo está lejos, pero
-- el defecto es idéntico y no tiene sentido dejar la trampa armada.
alter table public.categories
  alter column id set default public.nuevo_id('c-', 'public.categories_id_seq');
