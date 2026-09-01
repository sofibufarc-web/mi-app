import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { slugify } from "@/lib/slug";

/**
 * POST /api/admin/upload — sube imágenes de producto.
 *
 * Recibe un FormData con uno o varios archivos en el campo `files` y devuelve
 * los paths públicos: { paths: ["/uploads/rodillo-lana-1737031234-a1b2.jpg"] }.
 *
 * La ruta está bajo /api/admin, así que `src/proxy.ts` ya exige sesión.
 *
 * ⚠️ VERCEL: escribe en `public/uploads`, que allá es efímero. En local anda
 * bien; en producción hay que migrar a Supabase Storage o Vercel Blob.
 *
 * Un "Route Handler" es un endpoint HTTP común. Lo usamos en vez de una Server
 * Action porque el uploader necesita subir los archivos ANTES de guardar el
 * producto, para poder mostrar la vista previa y dejar reordenar.
 */

/**
 * Los segmentos van escritos como literales a propósito. Si armáramos la ruta
 * con una variable, el bundler no puede saber a qué carpeta apunta y termina
 * copiando todo el proyecto (incluido /public) dentro del deploy.
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Nombre de archivo seguro y único: sin espacios, sin acentos, sin colisiones. */
function safeFileName(original: string): string {
  const ext = path.extname(original).toLowerCase() || ".jpg";
  const base = slugify(path.basename(original, path.extname(original))) || "imagen";
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base.slice(0, 40)}-${unique}${ext}`;
}

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

  // Validamos TODO antes de escribir nada, para no dejar archivos a medias.
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

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const paths: string[] = [];
  for (const file of files) {
    const fileName = safeFileName(file.name);
    // `arrayBuffer()` trae el archivo entero a memoria. Está bien para imágenes
    // de hasta 5 MB; para archivos grandes se usaría un stream.
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    paths.push(`${siteConfig.uploads.publicPath}/${fileName}`);
  }

  return NextResponse.json({ paths });
}
