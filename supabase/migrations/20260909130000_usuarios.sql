-- ============================================================================
-- Usuarios de la aplicación.
--
-- Hasta acá el login comparaba contra cuatro variables de entorno
-- (CLIENT_USER, CLIENT_PASSWORD, ADMIN_USER, ADMIN_PASSWORD): un solo usuario
-- por rol, y para cambiar una contraseña había que editar el .env y volver a
-- deployar. Desde esta migración los usuarios viven acá y se administran desde
-- /admin/usuarios.
--
-- Esta migración solo AGREGA una tabla. No toca ni borra nada de lo que ya hay
-- en categories, products ni store_config.
--
-- No inserta ningún usuario a propósito: la tabla arranca vacía y el primer
-- admin se crea con `npm run db:usuario -- <usuario> admin`. Un usuario
-- sembrado desde el repo sería una contraseña conocida y pública.
-- ============================================================================


create sequence public.users_id_seq;

create table public.users (
  -- Mismo formato de id que el resto de las tablas: "u-001", "u-002"…
  id            text primary key
                default 'u-' || lpad(nextval('public.users_id_seq')::text, 3, '0'),
  username      text not null,

  -- NUNCA la contraseña en claro. Acá va lo que devuelve hashPassword() de
  -- src/lib/password.ts, con este formato:
  --
  --     pbkdf2$sha256$<iteraciones>$<salt en base64>$<hash en base64>
  --
  -- Los parámetros van adentro del propio texto para poder subir las
  -- iteraciones más adelante sin invalidar las contraseñas ya guardadas.
  password_hash text not null,

  -- Los dos roles de src/config/site.ts. El check es la red que evita que un
  -- typo ("Admin", "cliente ") cree un rol que después no matchea con nada.
  role          text not null check (role in ('admin', 'cliente')),

  -- false = no puede iniciar sesión. Se prefiere desactivar antes que borrar:
  -- deja el rastro de que ese usuario existió.
  active        boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Único ignorando mayúsculas: "Wiedmer" y "wiedmer" no pueden ser dos cuentas
-- distintas. Es un índice sobre lower(username) y no una columna citext para no
-- sumar otra extensión; el login busca con la misma expresión, así que Postgres
-- resuelve por índice.
create unique index users_username_key on public.users (lower(username));

-- El mismo trigger que ya usan las otras tablas: la fecha la pone la base, no
-- la app, así que es imposible olvidarse.
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------------
-- Misma regla que las otras tres tablas, y acá importa todavía más: esta tabla
-- tiene los hashes de las contraseñas. RLS activo y CERO políticas = los roles
-- anon y authenticated no pueden ni leerla. La app entra por la conexión
-- directa de DIRECT_URL, que usa el dueño de las tablas y no pasa por RLS.
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
