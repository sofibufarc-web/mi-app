/**
 * Envoltorio del CLI de Supabase.
 *
 *   npm run db:push     aplica a la nube las migraciones que falten
 *   npm run db:status    muestra cuáles están aplicadas y cuáles no
 *   npm run db:new  <nombre>   crea un archivo de migración vacío, con fecha
 *
 * Existe por una razón chica pero molesta: el CLI necesita la cadena de
 * conexión, que vive en .env.local, y npm no lee ese archivo. Node sí, con
 * --env-file. Este script hace de puente y le pasa DIRECT_URL al comando.
 *
 * Se usa DIRECT_URL (puerto 5432) y no DATABASE_URL (6543): una migración
 * necesita mantener abierta una sesión de principio a fin, y el pooler en modo
 * transacción no lo garantiza.
 */
import { spawnSync } from "node:child_process";

const [accion, ...resto] = process.argv.slice(2);

const url = process.env.DIRECT_URL;
if (!url) {
  console.error(
    "Falta DIRECT_URL en .env.local.\n" +
      "Está en Supabase → Project Settings → Database → Connection string → Session pooler.",
  );
  process.exit(1);
}

const comandos = {
  push: ["db", "push", "--db-url", url],
  status: ["migration", "list", "--db-url", url],
  new: ["migration", "new", ...resto],
};

const args = comandos[accion];
if (!args) {
  console.error(`Acción desconocida: ${accion}. Usá push, status o new.`);
  process.exit(1);
}

if (accion === "new" && resto.length === 0) {
  console.error('Falta el nombre. Ejemplo: npm run db:new -- agregar_tabla_pedidos');
  process.exit(1);
}

const r = spawnSync("npx", ["supabase", ...args], { stdio: "inherit" });
process.exit(r.status ?? 1);
