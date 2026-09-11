import "server-only";

import path from "node:path";

import { slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Las fotos de producto, en Supabase Storage.
 * ---------------------------------------------------------------------------
 * Storage es el servicio de archivos de Supabase: el mismo proyecto que ya
 * guarda la base y las cuentas. Los archivos viven en un "bucket" (un balde,
 * una carpeta con nombre) y se sirven por una URL pública.
 *
 * ## Por qué no se guardan más en `public/uploads/`
 *
 * Porque en Vercel eso no existe. Cada deploy arma una copia nueva del sitio a
 * partir del repositorio, y el disco donde corre es de solo lectura salvo
 * `/tmp`, que además se borra solo. Una foto escrita ahí duraba hasta el
 * siguiente deploy —o hasta el siguiente pedido, si caía en otra máquina—.
 *
 * ## Cómo se autoriza la subida
 *
 * Con la sesión del admin que está usando el panel, no con una credencial
 * nueva. El cliente de `supabase/server.ts` lleva las cookies del pedido, así
 * que Storage ve quién pide y aplica las políticas de la migración
 * `20260911140000_storage_imagenes.sql`: escribir, solo un admin activo.
 *
 * La clave secreta del proyecto sigue sin usarse en ningún lado, que es la
 * regla de la casa: una credencial que no existe no se puede filtrar.
 */

/** El bucket donde van las fotos. Tiene que coincidir con el de la migración. */
export const BUCKET_IMAGENES = "productos";

/**
 * Nombre de archivo seguro y único: sin espacios, sin acentos, sin colisiones.
 *
 * Lo de "único" no es manía: dos personas subiendo `foto.jpg` el mismo día
 * pisarían una el archivo de la otra, y la primera se quedaría con la imagen
 * equivocada en su producto sin enterarse.
 */
function nombreSeguro(original: string): string {
  const ext = path.extname(original).toLowerCase() || ".jpg";
  const base = slugify(path.basename(original, path.extname(original))) || "imagen";
  const unico = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base.slice(0, 40)}-${unico}${ext}`;
}

/** El error que devuelve Storage cuando el bucket todavía no se creó. */
function faltaElBucket(mensaje: string): boolean {
  return /bucket not found/i.test(mensaje);
}

/**
 * Sube un archivo y devuelve su URL pública, o un error listo para mostrar.
 *
 * La URL que sale de acá es absoluta
 * (`https://<proyecto>.supabase.co/storage/v1/object/public/productos/...`) y
 * es la que se guarda en `products.images`. Por eso `next.config.ts` tiene que
 * tener ese dominio en `images.remotePatterns`: `next/image` solo optimiza
 * imágenes de dominios declarados, para que nadie pueda usar el servidor de
 * imágenes del sitio para procesar fotos ajenas.
 */
export async function subirImagen(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const nombre = nombreSeguro(file.name);

  const { error } = await supabase.storage
    .from(BUCKET_IMAGENES)
    .upload(nombre, file, {
      contentType: file.type,
      // Nunca pisar un archivo existente. Con el nombre único de arriba no
      // debería pasar; si pasara, preferimos el error a perder una foto.
      upsert: false,
      // Cuánto tiempo puede cachear el navegador (y el CDN) el archivo. Un año:
      // el nombre es único, así que una imagen nunca cambia de contenido; si se
      // reemplaza la foto de un producto, cambia la URL entera.
      cacheControl: "31536000",
    });

  if (error) {
    if (faltaElBucket(error.message)) {
      return {
        error:
          `Falta el bucket "${BUCKET_IMAGENES}" en Supabase Storage. ` +
          "Corré `npm run db:push` para aplicar las migraciones.",
      };
    }
    // "new row violates row-level security policy" = la sesión no es de un
    // admin activo. Se traduce, porque el mensaje crudo no le dice nada a nadie.
    if (/row-level security/i.test(error.message)) {
      return { error: "Tu sesión no tiene permiso para subir imágenes." };
    }
    return { error: `Supabase Storage rechazó "${file.name}": ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(nombre);
  return { url: data.publicUrl };
}
