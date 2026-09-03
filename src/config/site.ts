/**
 * Configuración ESTÁTICA de la app.
 *
 * Ojo con la diferencia:
 * - Este archivo (`src/config/site.ts`) tiene cosas que NO se editan desde el
 *   panel: credenciales, secreto de sesión, flags de comportamiento. Es un .ts
 *   común, sin `fs`, así que se puede importar desde el proxy (que corre en el
 *   runtime Edge, donde `fs` no existe).
 * - `src/data/store-config.json` tiene lo que SÍ se edita desde el panel:
 *   nombre de la tienda, WhatsApp, textos, contacto, colores.
 *
 * Casi todo acá tiene un valor por defecto, así que la app arranca sin `.env`.
 *
 * EXCEPCIÓN: las credenciales NO tienen valor por defecto. Se leen solo de
 * variables de entorno, porque este archivo se sube al repositorio y una
 * contraseña escrita acá quedaría pública y en el historial de git para
 * siempre.
 *
 * Para desarrollo local: copiá `.env.example` a `.env.local` y completalas.
 * `.env.local` está ignorado por git.
 */

export const siteConfig = {
  /**
   * DOS niveles de acceso, con la misma cookie y el mismo mecanismo:
   *
   * - `client`: el login genérico que se le da a los comercios. Habilita ver
   *   los precios y armar pedidos. Es el mismo usuario y contraseña para
   *   todos los clientes.
   * - `admin`: el login del panel `/admin`. Incluye todo lo del cliente.
   *
   * Quien entra sin ninguno de los dos ve el catálogo completo (fotos,
   * nombres, códigos, descripciones) pero sin precios y sin carrito.
   */
  auth: {
    client: {
      user: process.env.CLIENT_USER ?? "",
      password: process.env.CLIENT_PASSWORD ?? "",
    },
    admin: {
      user: process.env.ADMIN_USER ?? "",
      password: process.env.ADMIN_PASSWORD ?? "",
    },
    /**
     * Sal para hashear el token de sesión. Cualquier cadena larga y aleatoria.
     * Si se filtra, alguien puede fabricar una cookie de sesión válida sin
     * saber la contraseña, así que se trata como un secreto más.
     */
    sessionSecret: process.env.SESSION_SECRET ?? "",
    /** Nombre de la cookie httpOnly de sesión. */
    cookieName: "wiedmer_session",
    /** Duración de la sesión: 7 días, en segundos. */
    maxAge: 60 * 60 * 24 * 7,
  },

  /**
   * false (default) = el catálogo se ve sin iniciar sesión (pero sin precios).
   * true = hay que iniciar sesión para ver absolutamente todo.
   * Lo lee el proxy para decidir qué rutas proteger.
   */
  requireLoginForCatalog: false,

  /** Cookie donde se guarda el tema elegido. Ausente = "el del sistema". */
  themeCookie: "wiedmer_theme",

  /** Límites de la subida de imágenes desde el panel. */
  uploads: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    /** Carpeta pública donde se guardan. Ver la advertencia de Vercel en CLAUDE.md. */
    dir: "public/uploads",
    publicPath: "/uploads",
  },

  /** Límites de la carga de lista de precios. */
  priceList: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedExtensions: [".xlsx", ".xls", ".csv"],
  },
} as const;

/** Los dos roles posibles. `null` = visitante sin sesión. */
export type Role = "cliente" | "admin";

/**
 * ¿Está configurado el login del panel?
 *
 * Se usa para no dejar el panel abierto por accidente: si falta alguna
 * variable, el login rechaza cualquier intento en vez de aceptar vacíos.
 */
export function adminAuthIsConfigured(): boolean {
  const { admin, sessionSecret } = siteConfig.auth;
  return admin.user !== "" && admin.password !== "" && sessionSecret !== "";
}

/** ¿Está configurado el login de clientes (el que destraba los precios)? */
export function clientAuthIsConfigured(): boolean {
  const { client, sessionSecret } = siteConfig.auth;
  return client.user !== "" && client.password !== "" && sessionSecret !== "";
}

/**
 * ¿Hay alguna forma de iniciar sesión?
 *
 * Si no hay ninguna, el sitio funciona igual pero sin precios para nadie. Es a
 * propósito: preferimos que se note enseguida que falta configurar algo antes
 * que mostrarle la lista mayorista a todo el mundo por un olvido.
 */
export function anyAuthIsConfigured(): boolean {
  return adminAuthIsConfigured() || clientAuthIsConfigured();
}

/** Clave del carrito en localStorage. Versionada por si cambia la forma del dato. */
export const CART_STORAGE_KEY = "wiedmer_cart_v1";
