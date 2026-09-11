import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { subirImagen } from "@/lib/storage";

/**
 * POST /api/admin/upload — sube imágenes de producto.
 *
 * Recibe un FormData con uno o varios archivos en el campo `files` y devuelve
 * las URLs públicas:
 * `{ paths: ["https://<proyecto>.supabase.co/storage/v1/object/public/productos/rodillo-lana-x9f2.jpg"] }`.
 *
 * La ruta está bajo /api/admin, así que `src/proxy.ts` ya exige sesión, y las
 * políticas de Storage exigen además que esa sesión sea de un admin activo.
 *
 * Los archivos van a **Supabase Storage** (ver `src/lib/storage.ts`). Antes se
 * escribían en `public/uploads/`, que funcionaba en una máquina propia pero no
 * en Vercel, donde el disco se descarta en cada deploy.
 *
 * Un "Route Handler" es un endpoint HTTP común. Lo usamos en vez de una Server
 * Action porque el uploader necesita subir los archivos ANTES de guardar el
 * producto, para poder mostrar la vista previa y dejar reordenar.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el formulario." },
      { status: 400 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "No mandaste ninguna imagen." }, { status: 400 });
  }

  // Validamos TODO antes de subir nada, para no dejar la mitad de las fotos
  // arriba y la otra mitad no.
  for (const file of files) {
    if (!(siteConfig.uploads.allowedTypes as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        {
          error: `"${file.name}" no es una imagen válida. Aceptamos JPG, PNG, WebP y AVIF.`,
        },
        { status: 400 },
      );
    }
    if (file.size > siteConfig.uploads.maxSizeBytes) {
      const maxMb = Math.round(siteConfig.uploads.maxSizeBytes / 1024 / 1024);
      return NextResponse.json(
        { error: `"${file.name}" pesa más de ${maxMb} MB.` },
        { status: 400 },
      );
    }
  }

  const paths: string[] = [];
  for (const file of files) {
    const resultado = await subirImagen(file);
    if ("error" in resultado) {
      // Si una falla, devolvemos las que ya subieron igual: el uploader las
      // agrega a la lista y el usuario reintenta solo con la que faltó.
      return NextResponse.json({ error: resultado.error, paths }, { status: 502 });
    }
    paths.push(resultado.url);
  }

  return NextResponse.json({ paths });
}
