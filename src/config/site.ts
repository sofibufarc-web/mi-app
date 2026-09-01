/**
 * Configuración ESTÁTICA de la app.
 *
 * Ojo con la diferencia:
 * - Este archivo (`src/config/site.ts`) tiene cosas que NO se editan desde el
 *   panel: credenciales, secreto de sesión, flags de comportamiento. Es un .ts
 *   común, sin `fs`, así que se puede importar desde el middleware (que corre en
 *   el runtime Edge, donde `fs` no existe).
 * - `src/data/store-config.json` tiene lo que SÍ se edita desde el panel:
 *   nombre de la tienda, WhatsApp, textos, contacto, colores.
 *
 * Casi todo acá tiene un valor por defecto, así que la app arranca sin `.env`.
 *
 * EXCEPCIÓN: las credenciales del panel NO tienen valor por defecto. Se leen
 * solo de variables de entorno, porque este archivo se sube al repositorio y
 * una contraseña escrita acá quedaría pública y en el historial de git para
 * siempre. Sin esas variables el catálogo funciona igual; lo único que queda
 * deshabilitado es el login del panel (ver `adminAuthIsConfigured`).
 *
 * Para desarrollo local: copiá `.env.example` a `.env.local` y completalas.
 * `.env.local` está ignorado por git.
 */

export const siteConfig = {
  /**
   * Credenciales del login genérico (las mismas para todos los clientes).
   * Sin valor por defecto a propósito: ver el comentario de arriba.
   */
  auth: {
    user: process.env.ADMIN_USER ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
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
   * false (default) = el catálogo y el carrito son públicos.
   * true = hay que iniciar sesión para ver cualquier cosa.
   * Lo lee el middleware para decidir qué rutas proteger.
   */
  requireLoginForCatalog: false,

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

/**
 * ¿Están las tres variables del panel definidas?
 *
 * Se usa para no dejar el panel abierto por accidente: si falta alguna, el
 * login rechaza cualquier intento en vez de aceptar valores vacíos.
 */
export function adminAuthIsConfigured(): boolean {
  const { user, password, sessionSecret } = siteConfig.auth;
  return user !== "" && password !== "" && sessionSecret !== "";
}

/** Clave del carrito en localStorage. Versionada por si cambia la forma del dato. */
export const CART_STORAGE_KEY = "wiedmer_cart_v1";
