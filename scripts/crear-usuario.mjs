/**
 * Alta de una cuenta desde la terminal.
 *
 *   npm run db:usuario -- <email> <admin|cliente>
 *   npm run db:usuario -- sofia@ejemplo.com admin
 *
 * Para qué existe, si el panel ya tiene /admin/usuarios: para entrar al panel
 * hay que ser admin, y alguien tiene que crear el PRIMER admin. Es el arranque
 * del sistema. También es la salida de emergencia si algún día no queda ningún
 * admin activo.
 *
 * La contraseña se pide por teclado y no se muestra. Tampoco se pasa como
 * argumento a propósito: los argumentos quedan en el historial de la terminal
 * (~/.zsh_history) y a la vista de cualquiera que corra `ps` mientras corre.
 *
 * ## Qué hace, en tres pasos
 *
 * 1. Crea la cuenta en **Supabase Auth**, por la API. Las contraseñas las guarda
 *    Supabase; este script nunca las escribe en ninguna tabla.
 * 2. Le confirma el email por SQL. El alta la está haciendo alguien con acceso a
 *    la terminal del proyecto, no hace falta que espere un mail.
 * 3. Le pone el rol en `public.profiles`. El perfil ya existe: lo creó solo el
 *    trigger `on_auth_user_created` cuando nació la cuenta.
 *
 * Si el email ya tiene cuenta, no falla: le corrige el rol y lo reactiva. Es lo
 * que hace falta cuando alguien se quedó afuera del panel.
 */
import { createInterface } from "node:readline";
import postgres from "postgres";

const LARGO_MINIMO = 8;

/* -------------------------------------------------------------------------- */
/* Argumentos y entorno                                                        */
/* -------------------------------------------------------------------------- */

const [email, rol] = process.argv.slice(2);

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!email || !rol) {
  salir(
    "Uso: npm run db:usuario -- <email> <rol>\n" +
      "  <rol> es admin o cliente.",
  );
}
if (rol !== "admin" && rol !== "cliente") {
  salir(`Rol inválido: "${rol}". Tiene que ser admin o cliente.`);
}
if (!email.includes("@")) {
  salir(`"${email}" no parece un email. Supabase Auth identifica por email.`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dbUrl = process.env.DIRECT_URL;

if (!url || !key || !dbUrl) {
  salir(
    "Faltan variables. Hacen falta NEXT_PUBLIC_SUPABASE_URL,\n" +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y DIRECT_URL en .env.local.",
  );
}

/* -------------------------------------------------------------------------- */
/* La contraseña, sin que se vea al tipearla                                   */
/* -------------------------------------------------------------------------- */

/**
 * Pide una contraseña sin mostrarla.
 *
 * El truco: readline escribe cada tecla en la salida a medida que se tipea, así
 * que se intercepta ese write y no se deja pasar nada mientras dura la
 * pregunta. No se ven ni asteriscos: así nadie deduce el largo mirando de reojo.
 *
 * Una sola interfaz de readline para las dos preguntas. Abrir una por pregunta
 * cierra la entrada estándar después de la primera, y la segunda queda esperando
 * para siempre.
 */
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

const password = await preguntarOculto(`Contraseña para ${email} (${rol}): `);
if (password.length < LARGO_MINIMO) {
  rl.close();
  salir(`Muy corta: mínimo ${LARGO_MINIMO} caracteres.`);
}
const repetida = await preguntarOculto("Repetila: ");
rl.close();
process.stdout.write = escribir;

if (password !== repetida) salir("Las contraseñas no coinciden.");

/* -------------------------------------------------------------------------- */
/* 1. La cuenta en Supabase Auth                                               */
/* -------------------------------------------------------------------------- */

const sql = postgres(dbUrl, { prepare: false });

try {
  const existente = await sql`
    select id, role from public.profiles where lower(email) = lower(${email})`;

  let id;

  if (existente.length > 0) {
    id = existente[0].id;
    console.log(`La cuenta ya existía (rol actual: ${existente[0].role}).`);
    console.log("No se le cambia la contraseña: para eso está el link de");
    console.log("restablecimiento del panel. Se le corrige el rol y se reactiva.");
  } else {
    const r = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const cuerpo = await r.json();

    if (!r.ok) {
      salir(`Supabase rechazó el alta: ${cuerpo.msg ?? cuerpo.error_description ?? r.status}`);
    }

    id = cuerpo.id ?? cuerpo.user?.id;
    if (!id) salir("Supabase no devolvió el id de la cuenta creada.");
    console.log("✓ cuenta creada en Supabase Auth");
  }

  /* ---------------------------------------------------------------------- */
  /* 2 y 3. Confirmar el email y poner el rol                                */
  /* ---------------------------------------------------------------------- */

  await sql`
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = ${id}`;

  const [perfil] = await sql`
    update public.profiles
    set role = ${rol}, active = true
    where id = ${id}
    returning id, email, role, active`;

  if (!perfil) {
    salir(
      `La cuenta ${id} existe pero no tiene perfil. ¿Se aplicó la migración\n` +
        "20260909140000_perfiles.sql? Corré: npm run db:push",
    );
  }

  console.log(`✓ ${perfil.email} · ${perfil.role} · activo: ${perfil.active}`);
} finally {
  await sql.end();
}
