-- ============================================================================
-- Perfiles: el rol de cada usuario de Supabase Auth.
--
-- Desde esta migración el login lo maneja **Supabase Auth**: las cuentas, las
-- contraseñas y las sesiones viven en el esquema `auth`, que administra el
-- propio Supabase. Nosotros no guardamos contraseñas nunca más.
--
-- Lo que Supabase Auth NO sabe es si alguien es admin o cliente: eso es una
-- idea de esta aplicación, no del servicio de autenticación. Para eso está esta
-- tabla, que le cuelga un rol a cada cuenta.
--
-- Por qué una tabla y no `app_metadata` de la cuenta: escribir en app_metadata
-- exige la clave secreta del proyecto (service_role). Una tabla propia se
-- administra con la misma conexión a Postgres que ya usa todo el resto de la
-- app, sin sumar credenciales.
-- ============================================================================


create table public.profiles (
  -- Mismo id que la cuenta en auth.users, no uno propio. Así no hay forma de
  -- que un perfil apunte a una cuenta que no existe.
  --
  -- `on delete cascade`: si se borra la cuenta, se va el perfil con ella. Sin
  -- esto quedarían perfiles huérfanos apuntando a nadie.
  id         uuid primary key references auth.users (id) on delete cascade,

  -- Se guarda para poder listar el panel sin pedirle los emails a la API de
  -- Auth, que necesitaría la clave secreta. Lo mantiene al día el trigger de
  -- más abajo.
  email      text not null,

  role       text not null default 'cliente' check (role in ('admin', 'cliente')),

  -- false = la cuenta existe pero no puede entrar. Se prefiere desactivar antes
  -- que borrar: deja el rastro de que ese usuario existió.
  active     boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where role = 'admin';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Un perfil por cada cuenta, automáticamente
-- ---------------------------------------------------------------------------
-- Sin esto habría que acordarse de crear el perfil cada vez que nace una
-- cuenta, y el día que alguien se registre por otro camino (un link de
-- invitación, el panel de Supabase) quedaría sin rol y sin poder entrar.
-- El trigger lo hace la base, así que no hay forma de saltearlo.
--
-- `security definer` es necesario: el trigger corre con los permisos del rol de
-- Auth, que no puede escribir en `public`. Con esto corre con los del dueño de
-- la función. `set search_path = ''` es la contracara obligatoria: sin eso,
-- alguien podría crear una tabla `profiles` en otro esquema y hacer que la
-- función escriba ahí.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Y si alguien cambia su email desde Auth, que la copia acá lo siga.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();


-- ---------------------------------------------------------------------------
-- Las cuentas que ya existen
-- ---------------------------------------------------------------------------
-- El trigger solo corre de acá en adelante. Las cuentas creadas antes de esta
-- migración necesitan su perfil a mano.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------------
-- Misma regla que las otras tablas: RLS activo y CERO políticas. La app entra
-- por la conexión directa de DIRECT_URL, que usa el dueño de las tablas y no
-- pasa por RLS. La clave pública del navegador no puede leer quién es admin.
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
