-- ============================================================================
-- Se va la tabla `users` propia.
--
-- Desde la migración de perfiles, el login lo maneja Supabase Auth: las cuentas
-- y las contraseñas viven en `auth.users` y el rol en `public.profiles`. La
-- tabla `public.users` quedó sin que nadie la lea ni la escriba.
--
-- Se borra y no se deja "por las dudas" porque una tabla muerta con hashes de
-- contraseñas adentro es lo peor de los dos mundos: no sirve para nada y sigue
-- siendo algo que robar. Además, tener dos tablas de usuarios es la receta para
-- que alguien, en seis meses, escriba una consulta contra la equivocada.
--
-- Si hiciera falta volver atrás, las migraciones 20260909130000 (la tabla) y el
-- historial de git tienen todo. Las contraseñas no se pueden recuperar de un
-- hash, así que en cualquier caso habría que darlas de nuevo.
-- ============================================================================

drop table if exists public.users;
drop sequence if exists public.users_id_seq;
