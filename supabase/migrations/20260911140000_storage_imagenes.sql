-- ============================================================================
-- Imágenes de producto en Supabase Storage
--
-- Hasta acá `/api/admin/upload` escribía los archivos en `public/uploads/`, o
-- sea en el disco del servidor. En una máquina propia eso anda; en Vercel no:
-- el disco es de solo lectura fuera de /tmp y además se descarta en cada
-- deploy, así que las fotos subidas desde el panel desaparecían solas.
--
-- Supabase Storage es un servicio de archivos que viene con el mismo proyecto
-- que ya usamos para la base y el login. Los archivos viven en un "bucket"
-- —un balde, una carpeta con nombre— y se sirven por una URL pública.
--
-- ## Por qué el bucket es público
--
-- Son fotos de catálogo: las ve cualquiera que entre al sitio, igual que el
-- nombre y el código del artículo. Lo que está detrás del login son los
-- PRECIOS, no las imágenes. Público acá significa "se puede mirar sin sesión",
-- no "cualquiera puede escribir": subir sigue estando restringido, abajo.
--
-- ## Por qué no hace falta una credencial nueva
--
-- Supabase Storage guarda un renglón por archivo en la tabla
-- `storage.objects`, y esa tabla tiene Row Level Security como cualquier otra.
-- Entonces el permiso de subir se escribe como una política, y el servidor
-- sube usando la sesión del admin que está usando el panel. No se necesita la
-- clave secreta del proyecto, que es la que este proyecto evita a propósito.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- El bucket
-- ---------------------------------------------------------------------------
-- `file_size_limit` y `allowed_mime_types` repiten los límites que el endpoint
-- ya valida en `src/config/site.ts`. No es redundancia al pedo: la validación
-- del código protege contra el error, y la del servicio contra que alguien
-- llame a la API por afuera de nuestro endpoint.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------------
-- "¿El que está pidiendo esto es admin?"
-- ---------------------------------------------------------------------------
-- `auth.uid()` es el id de la cuenta dueña del token con el que llega el
-- pedido; es null si no hay sesión. El rol vive en `public.profiles`.
--
-- La función es `security definer` porque `profiles` tiene RLS activo y cero
-- políticas: el rol `authenticated` no puede leerla ni de casualidad. Con
-- security definer la consulta corre con los permisos del dueño de la función,
-- que sí puede. Es justamente el caso para el que existe: dejar que alguien
-- responda UNA pregunta puntual sobre una tabla que no puede leer.
--
-- `set search_path = ''` es la contracara obligatoria, igual que en
-- `handle_new_user()`: sin eso alguien podría crear una tabla `profiles` en
-- otro esquema y hacer que la función la lea a ella.
create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and active
  );
$$;

comment on function public.es_admin() is
  'true si el pedido viene con la sesión de un admin activo. La usan las políticas de Storage.';


-- ---------------------------------------------------------------------------
-- Quién puede escribir en el bucket
-- ---------------------------------------------------------------------------
-- No hay política de SELECT y no hace falta: el bucket es público, así que la
-- lectura por URL (`/storage/v1/object/public/productos/...`) no pasa por RLS.
--
-- Las tres de escritura son solo para admins. Un cliente con sesión —que puede
-- ver precios y comprar— no puede subir ni borrar una foto.
--
-- UPDATE lleva `using` y `with check`: `using` decide qué filas se pueden
-- tocar y `with check` cómo pueden quedar. Sin la segunda, un admin podría
-- mover un archivo de este bucket a otro.
create policy "Solo un admin sube imágenes de producto"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

create policy "Solo un admin reemplaza imágenes de producto"
  on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.es_admin())
  with check (bucket_id = 'productos' and public.es_admin());

create policy "Solo un admin borra imágenes de producto"
  on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.es_admin());
