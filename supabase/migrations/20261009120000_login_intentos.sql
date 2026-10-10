-- ============================================================================
-- Intentos fallidos de login, para frenar el adivinar contraseñas
--
-- El login de clientes pide solo una contraseña compartida. Sin un freno,
-- alguien podría probar claves sin parar hasta dar con la correcta.
--
-- ## Por qué una tabla y no una variable en memoria
--
-- En Vercel cada pedido puede caer en una instancia distinta del servidor, y
-- las instancias se crean y se destruyen todo el tiempo. Un contador en
-- memoria arrancaría de cero a cada rato. La base es el único lugar que ven
-- todas las instancias.
--
-- ## Por qué no alcanza el límite de Supabase
--
-- Supabase limita los intentos de login por IP, pero la IP que ve es la de
-- Vercel (el servidor), no la del visitante. Todos los clientes compartirían
-- el mismo cupo. Por eso el conteo es propio, por la IP que reenvía Vercel.
--
-- Como el resto de las tablas: RLS activo y CERO políticas. La app entra por
-- la conexión directa y las claves públicas del navegador no ven nada.
-- ============================================================================

create table public.login_intentos (
  id bigint generated always as identity primary key,
  ip text not null,
  creado_en timestamptz not null default now()
);

-- Cada consulta es "cuántos intentos tuvo esta IP en los últimos N minutos".
create index login_intentos_ip_fecha_idx
  on public.login_intentos (ip, creado_en desc);

alter table public.login_intentos enable row level security;
