/**
 * Cambia la contraseña de una cuenta, desde la terminal.
 *
 *   npm run db:password -- <email>
 *   npm run db:password -- sofia@ejemplo.com
 *
 * Para qué existe, si ya está el mail de restablecimiento: el mail es el camino
 * para un cliente, y el bueno, porque la contraseña de una persona no tiene por
 * qué pasar por las manos de otra. Pero depende del correo, y el que trae
 * Supabase por defecto sólo escribe a integrantes del proyecto y con un tope muy
 * bajo por hora. Este script es la salida de emergencia para el dueño del
 * proyecto, el mismo caso que `crear-usuario.mjs`: alguien con acceso a la
 * terminal y a la base.
 *
 * ## Por qué escribe en la tabla, cuando el resto de la app no lo hace
 *
 * La forma "oficial" de cambiarle la contraseña a otra cuenta es la API de
 * administración de Supabase, y esa pide la **clave secreta** del proyecto. La
 * regla de la casa (ver CLAUDE.md, sección 5) es no tener esa clave en ningún
 * lado: una credencial que no existe no se puede filtrar. Así que se escribe por
 * la conexión a Postgres, que ya la tenemos.
 *
 * El formato lo impone Supabase Auth, no nosotros: `auth.users.encrypted_password`
 * guarda un hash **bcrypt**. `crypt(texto, gen_salt('bf', 10))` genera
 * exactamente eso, con el mismo costo 10 que usa Supabase. La contraseña en
 * limpio no se guarda en ningún lado: bcrypt no es reversible, y para verificar
 * un login se vuelve a hashear lo que la persona escribió y se comparan hashes.
 *
 * `pgcrypto` (la extensión que trae `crypt`) ya está instalada en el esquema
 * `extensions`, que es donde Supabase pone las suyas. Por eso se la llama con el
 * nombre completo.
 *
 * La contraseña se pide por teclado y no se muestra. Tampoco se pasa como
 * argumento: los argumentos quedan en el historial de la terminal.
 */
import { createInterface } from "node:readline";
import postgres from "postgres";

const LARGO_MINIMO = 8;

/* -------------------------------------------------------------------------- */
/* Argumentos y entorno                                                        */
/* -------------------------------------------------------------------------- */

const [email] = process.argv.slice(2);

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!email) salir("Uso: npm run db:password -- <email>");
if (!email.includes("@")) {
  salir(`"${email}" no parece un email. Supabase Auth identifica por email.`);
}

const dbUrl = process.env.DIRECT_URL;
if (!dbUrl) salir("Falta DIRECT_URL en .env.local.");

/* -------------------------------------------------------------------------- */
/* La contraseña, sin que se vea al tipearla                                   */
/* -------------------------------------------------------------------------- */

/* Misma mecánica que `crear-usuario.mjs`: readline escribe cada tecla a medida
   que llega, así que se intercepta esa escritura mientras dura la pregunta. Una
   sola interfaz para las dos preguntas; abrir una por pregunta cierra la entrada
   estándar y la segunda queda esperando para siempre. */
const rl = createInterface({ input: process.stdin, output: process.stdout });
const escribir = process.stdout.write.bind(process.stdout);
let silenciar = false;
process.stdout.write = (chunk, ...resto) =>
  silenciar ? true : escribir(chunk, ...resto);

function preguntarOculto(pregunta) {
  return new Promise((resolve) => {
    escribir(pregunta);
    silenciar = true;
    rl.question("", (respuesta) => {
      silenciar = false;
      escribir("\n");
      resolve(respuesta);
    });
  });
}

const password = await preguntarOculto(`Contraseña nueva para ${email}: `);
if (password.length < LARGO_MINIMO) {
  rl.close();
  salir(`Muy corta: mínimo ${LARGO_MINIMO} caracteres.`);
}
const repetida = await preguntarOculto("Repetila: ");
rl.close();
process.stdout.write = escribir;

if (password !== repetida) salir("Las contraseñas no coinciden.");

/* -------------------------------------------------------------------------- */
/* El cambio                                                                   */
/* -------------------------------------------------------------------------- */

const sql = postgres(dbUrl, { prepare: false });

try {
  const [cuenta] = await sql`
    select u.id, p.role, p.active
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) = lower(${email})`;

  if (!cuenta) salir(`No hay ninguna cuenta con el email ${email}.`);

  /* Las dos escrituras van juntas: si se cambiara la contraseña y fallara el
     cierre de sesiones, quedarían sesiones vivas con la contraseña vieja. */
  await sql.begin(async (tx) => {
    await tx`
      update auth.users
      set encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf', 10)),
          updated_at = now()
      where id = ${cuenta.id}`;

    /* Cerrar las sesiones abiertas es parte del cambio, no un extra: si alguien
       se quedó con la sesión iniciada en otra máquina, cambiar la contraseña no
       lo sacaría. Es lo que hace Supabase cuando el cambio pasa por su API. */
    await tx`delete from auth.refresh_tokens where user_id = ${cuenta.id}::text`;
    await tx`delete from auth.sessions where user_id = ${cuenta.id}`;
  });

  console.log(`✓ contraseña cambiada para ${email}`);
  console.log(`  rol: ${cuenta.role ?? "sin perfil"} · activa: ${cuenta.active ?? "—"}`);
  console.log("  Se cerraron las sesiones que estuvieran abiertas.");
} finally {
  await sql.end();
}
