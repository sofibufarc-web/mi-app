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
 * ## Las dos URLs, y cuál conviene
 *
 * Supabase da dos direcciones para la misma base. Las dos son un pooler, que
 * es un repartidor de conexiones: la base aguanta pocas conexiones abiertas y
 * el pooler las presta.
 *
 * - `DIRECT_URL` (puerto 5432) → pooler en **modo sesión**. Le asigna una
 *   conexión a cada cliente y se la deja mientras esté conectado. **Es la que
 *   usa la app**, y también las migraciones y los scripts de `scripts/`.
 * - `DATABASE_URL` (puerto 6543) → pooler en **modo transacción**. Presta la
 *   conexión mientras dura una consulta o una transacción y después la
 *   recupera. En teoría rinde mucho más; en la práctica esta app se cuelga con
 *   él. Ver abajo.
 *
 * ## Por qué importa tanto en Vercel, y qué pasó la primera vez que se publicó
 *
 * En Vercel el sitio no es un servidor encendido: son muchas copias que se
 * prenden y se apagan según el tráfico, y cada una abre sus propias conexiones.
 * Con el modo sesión cada copia se queda con las suyas hasta apagarse, y el
 * pooler de este proyecto presta **15**. Con tres o cuatro copias vivas ya no
 * queda ninguna y todo lo que pide datos responde error 500:
 *
 *     (EMAXCONNSESSION) max clients reached in session mode
 *                       max clients are limited to pool_size: 15
 *
 * Es exactamente lo que pasó en el primer deploy.
 *
 * ## Por qué NO se usa el 6543, aunque resolvería lo de arriba
 *
 * Este driver **encadena** consultas por la misma conexión sin esperar cada
 * respuesta (pipelining), y el modo transacción pierde el hilo con eso: las
 * páginas dejan de responder, sin dar error.
 *
 * Se probó pasar la app al 6543 y hubo que volver atrás. Medido contra esta
 * misma base:
 *
 * - Un script suelto por el 6543 anda bien: 30 consultas juntas, 1035 ms. Por
 *   eso la prueba aislada no alcanza para decidir.
 * - La app real por el 6543: `/categoria/aerosoles` tardaba entre 2 y 7
 *   minutos, y después ni la home respondía. Hasta
 *   `select * from store_config where id = 1`, una fila de una tabla de una
 *   fila, moría por `statement timeout`.
 * - La misma página por el 5432: **1,9 s** la primera vez y 0,9 s en caliente.
 *
 * Lo que delata el mecanismo es `pg_stat_activity`: las conexiones quedaban
 * `idle` con `wait_event = ClientRead` y la consulta ya respondida. Es decir,
 * la base contestó y el driver nunca levantó la respuesta. No es lentitud de
 * la base ni bloqueos: no había ninguna transacción abierta ni un solo lock.
 *
 * **Entonces lo de Vercel sigue pendiente.** El cupo de 15 conexiones en modo
 * sesión es real y es lo que tiró el primer deploy. La salida no es cambiar de
 * puerto: hay que bajar las conexiones que abre cada copia (de ahí `max: 1`) y,
 * si vuelve a pasar, mirar el pool_size del proyecto en Supabase.
 *
 * ## `prepare: false`
 *
 * Un "prepared statement" es una consulta que Postgres compila una vez y
 * después reutiliza. Vive atada a una conexión, así que con un pooler de por
 * medio la siguiente consulta puede no encontrarlo. En modo transacción no es
 * opcional: hay que desactivarlo.
 */

/**
 * El de sesión si está, y si no el de transacciones.
 *
 * El orden importa y es el de arriba: por el 6543 la app se cuelga. El fallback
 * existe sólo para un entorno viejo donde `DIRECT_URL` no esté cargada, y ahí
 * es mejor un sitio raro que un sitio caído.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Falta DIRECT_URL. Copiala de .env.example a .env.local con los datos de " +
      "tu proyecto de Supabase (Project Settings → Database → Connection string " +
      "→ Session pooler, puerto 5432).",
  );
}

/** ¿Estamos yendo por el pooler de transacciones? Se nota en el puerto. */
const modoTransaccion = url.includes(":6543");

/**
 * Cuántas conexiones abre cada copia del servidor.
 *
 * En modo transacción el pooler las recicla enseguida, así que unas pocas
 * rinden mucho. En modo sesión cada una queda tomada mientras la copia viva, y
 * el cupo es de 15 en total: ahí conviene pedir una sola y que el pipelining
 * del driver haga el resto.
 */
const max = modoTransaccion ? 5 : 1;

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
    max,
    // Devuelve la conexión al pooler cuando no se está usando. Cuanto antes
    // vuelva, antes la aprovecha otra copia del servidor.
    idle_timeout: 20,
    // Si la base no responde en 10 segundos, error claro en vez de esperar
    // para siempre.
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global_.__wiedmerSql = sql;
}
