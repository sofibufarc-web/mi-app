/**
 * Chequeo rápido de la conexión y del estado de la base.
 *
 *   node --env-file=.env.local scripts/probar-conexion.mjs
 *
 * `--env-file` es de Node: carga las variables de un archivo sin necesidad de
 * la librería dotenv. Next lo hace solo cuando arranca; un script suelto no.
 *
 * Usa DIRECT_URL (puerto 5432), que es la misma conexión que usa la app. El
 * porqué de ese puerto y no el 6543 está en src/lib/db.ts.
 */
import postgres from "postgres";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("Falta DIRECT_URL. ¿Corriste el script con --env-file=.env.local?");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

try {
  const filas = await sql`
        select 'categories'   as tabla, count(*) as n from public.categories
  union all select 'products',     count(*) from public.products
  union all select 'store_config', count(*) from public.store_config
  union all select 'profiles',     count(*) from public.profiles
  union all select 'auth.users',   count(*) from auth.users
  order by tabla`;
  console.log("\nContenido:");
  console.table(filas.map((r) => ({ tabla: r.tabla, filas: Number(r.n) })));

  // RLS activo + 0 políticas = la clave pública del navegador no puede leer nada.
  const seguridad = await sql`
    select c.relname,
           c.relrowsecurity as rls,
           (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname`;
  console.log("\nSeguridad (se espera rls=true y politicas=0):");
  console.table(
    seguridad.map((r) => ({ tabla: r.relname, rls: r.rls, politicas: Number(r.politicas) })),
  );

  // El buscador guarda el texto sin tildes, así que "latex" encuentra "Látex".
  const busqueda = await sql`
    select id, sku, name, price
    from public.products
    where search_text like '%latex%'
    order by id
    limit 3`;
  console.log("\nBuscador, buscando 'latex' sin tilde:");
  console.table(
    busqueda.map((r) => ({ id: r.id, sku: r.sku, nombre: r.name, precio: r.price })),
  );

  const [{ n: admins }] = await sql`
    select count(*) as n from public.profiles where role = 'admin' and active`;
  console.log(
    Number(admins) > 0
      ? `\nAdmins activos: ${admins}`
      : "\n⚠ No hay ningún admin activo: nadie puede entrar a /admin.\n" +
          "  Creá uno con: npm run db:usuario -- <usuario> admin",
  );

  const [{ last_value: ultimoP }] = await sql`select last_value from public.products_id_seq`;
  const [{ last_value: ultimoC }] = await sql`select last_value from public.categories_id_seq`;
  console.log(
    `\nPróximos ids: p-${String(Number(ultimoP) + 1).padStart(3, "0")} · ` +
      `c-${String(Number(ultimoC) + 1).padStart(3, "0")}\n`,
  );
} finally {
  await sql.end();
}
