import "server-only";

import postgres from "postgres";

/**
 * Conexión a Postgres (Supabase).
 * ---------------------------------------------------------------------------
 * La app habla con la base **directo por Postgres**, no por la API HTTP de
 * Supabase. Es la misma base; cambia el camino.
 *
 * `import "server-only"` hace que el build falle si alguien importa este
 * módulo desde un componente de cliente. Sin esa red, la cadena de conexión
 * —que incluye la contraseña— podría terminar en el navegador.
 *
 * ## Las dos URLs, y por qué la app usa la de 5432
 *
 * Supabase da dos direcciones para la misma base:
 *
 * - `DIRECT_URL`   (puerto 5432) → pooler en **modo sesión**. Es la que usa la
 *   app, y también las migraciones y los scripts de `scripts/`.
 * - `DATABASE_URL` (puerto 6543) → pooler en **modo transacción**. La app NO la
 *   usa. Ver abajo.
 *
 * Las dos son un pooler, no una conexión cruda: un servidor sin estado como
 * Next puede atender muchos pedidos a la vez, y sin un pooler de por medio cada
 * uno abriría su propia conexión hasta agotar el cupo de la base.
 *
 * ## Por qué NO se usa el pooler de transacciones (6543)
 *
 * Este driver **encadena** varias consultas por la misma conexión sin esperar
 * la respuesta de cada una (pipelining). Es lo que hace que una página que pide
 * seis cosas a la vez tarde lo que la más lenta y no la suma de todas.
 *
 * El pooler en modo transacción reparte una conexión de servidor distinta por
 * transacción. Con las consultas encadenadas, pierde el hilo y **deja de
 * responder**: no da error, simplemente se cuelga. Medido contra esta misma
 * base: 30 consultas de a una andan bien por los dos puertos, pero 30 en
 * paralelo tardan 504 ms por el 5432 y no terminan nunca por el 6543.
 *
 * El modo sesión no tiene ese problema porque mantiene la conexión asignada al
 * cliente mientras dura. `max` de acá abajo es lo que evita que se descontrole.
 *
 * (El puerto 6543 es el que recomienda Supabase para Prisma, que no encadena
 * consultas. Por eso la plantilla que da el panel trae esa URL primero.)
 *
 * ## `prepare: false`
 *
 * Un "prepared statement" es una consulta que Postgres compila una vez y
 * después reutiliza. Vive atada a una conexión, así que con un pooler de por
 * medio la siguiente consulta puede no encontrarlo. Se desactiva por las dudas.
 */

const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error(
    "Falta DIRECT_URL. Copiala de .env.example a .env.local con los datos de tu " +
      "proyecto de Supabase (Project Settings → Database → Connection string → " +
      "Session pooler, puerto 5432).",
  );
}

/**
 * En desarrollo, Next recarga los módulos con cada cambio de archivo. Sin este
 * cache se abriría un pool nuevo en cada recarga y, después de un rato
 * programando, la base cortaría por exceso de conexiones. Guardarlo en
 * `globalThis` lo salva de las recargas, que no lo vacían.
 */
const global_ = globalThis as typeof globalThis & { __wiedmerSql?: postgres.Sql };

export const sql =
  global_.__wiedmerSql ??
  postgres(url, {
    prepare: false,
    // Cada instancia del servidor abre como mucho 5 conexiones al pooler.
    max: 5,
    // Cierra las conexiones ociosas: en Vercel cada request puede caer en una
    // instancia distinta y las que quedan colgadas ocupan cupo al pedo.
    idle_timeout: 20,
    // Si la base no responde en 10 segundos, error claro en vez de esperar
    // para siempre.
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global_.__wiedmerSql = sql;
}
