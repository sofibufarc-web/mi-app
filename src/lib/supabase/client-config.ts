/**
 * Los dos datos con los que se habla con Supabase Auth.
 *
 * Están en un archivo aparte porque los usan tres clientes distintos (el del
 * servidor, el del proxy y el suelto de `admin.ts`), y tenerlos en un solo lugar
 * evita que uno quede apuntando a otro proyecto después de un copiar y pegar.
 *
 * La clave "publishable" es PÚBLICA: el prefijo `NEXT_PUBLIC_` significa que
 * Next la incluye en el JavaScript que baja al navegador. Está bien que así sea,
 * es su función. Lo que la hace inofensiva es que todas las tablas tienen Row
 * Level Security activo y cero políticas, así que con esa clave no se puede leer
 * ni un producto. Ver CLAUDE.md, sección 3.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** ¿Están las dos variables? Sin ellas no hay login posible. */
export function supabaseAuthIsConfigured(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";
}
