/**
 * Configuración ESTÁTICA de la app.
 *
 * Ojo con la diferencia entre los tres lugares donde hay configuración:
 *
 * - Este archivo (`src/config/site.ts`): lo que NO se edita desde ningún lado,
 *   porque cambiarlo es cambiar el comportamiento del código. Es un .ts común,
 *   sin acceso a la base, así que se puede importar desde el proxy (que corre en
 *   el runtime Edge, donde no se puede abrir una conexión a Postgres).
 * - La tabla `store_config`: lo que se edita desde `/admin/configuracion`
 *   (nombre de la tienda, WhatsApp, textos, contacto, colores). Se lee con
 *   `getStoreConfig()` de `src/lib/data-source.ts`.
 * - **Supabase Auth**: quién puede entrar. Las cuentas y las contraseñas las
 *   guarda Supabase; el rol vive en la tabla `profiles`. Se administra desde
 *   `/admin/usuarios`.
 *
 * **Ya no hay credenciales ni secretos acá.** Hubo dos etapas antes de esto: el
 * login comparaba contra CLIENT_USER / CLIENT_PASSWORD / ADMIN_USER /
 * ADMIN_PASSWORD, y después contra una tabla propia con contraseñas hasheadas a
 * mano. Hoy nada de eso existe: de las sesiones se ocupa Supabase Auth, con sus
 * propios tokens. `SESSION_SECRET` también quedó sin uso.
 */

export const siteConfig = {
  /**
   * DOS niveles de acceso. El rol es una columna de la tabla `profiles`:
   *
   * - `cliente`: habilita ver los precios y armar pedidos.
   * - `admin`: todo lo del cliente MÁS el panel `/admin`.
   *
   * Quien entra sin sesión ve el catálogo completo (fotos, nombres, códigos,
   * descripciones) pero sin precios y sin carrito.
   *
   * Las dos reglas que deciden qué puede hacer cada rol están en
   * `canSeePrices()` y `canManageStore()`, en `src/lib/auth.ts`.
   */

  /**
   * false (default) = el catálogo se ve sin iniciar sesión (pero sin precios).
   * true = hay que iniciar sesión para ver absolutamente todo.
   * Lo lee el proxy para decidir qué rutas proteger.
   */
  requireLoginForCatalog: false,

  /** Cookie donde se guarda el tema elegido. Ausente = "el del sistema". */
  themeCookie: "wiedmer_theme",

  /**
   * Límites de la subida de imágenes desde el panel.
   *
   * Los archivos van a Supabase Storage, al bucket `productos`
   * (ver `src/lib/storage.ts`). Ya no se escribe nada en `public/uploads/`:
   * en Vercel el disco se descarta en cada deploy.
   *
   * Estos dos límites están repetidos en el bucket, en la migración
   * `20260911140000_storage_imagenes.sql`. Si cambiás uno, cambiá el otro.
   */
  uploads: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },

  /** Límites de la carga de lista de precios. */
  priceList: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedExtensions: [".xlsx", ".xls", ".csv"],
  },
} as const;

/**
 * Los dos roles posibles. `null` = visitante sin sesión.
 *
 * La definición vive en `src/data/types.ts`, junto al resto del modelo, porque
 * ahora el rol es una columna de la tabla `users`. Se reexporta acá para no
 * romper los archivos que ya lo importaban de este lugar.
 */
export type { Role } from "@/data/types";

/** Clave del carrito en localStorage. Versionada por si cambia la forma del dato. */
export const CART_STORAGE_KEY = "wiedmer_cart_v1";
