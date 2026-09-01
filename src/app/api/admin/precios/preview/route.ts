import path from "node:path";
import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { buildPricePreview, PriceListError } from "@/lib/excel";
import { getCategories, getProducts } from "@/lib/data-source";

/**
 * POST /api/admin/precios/preview
 *
 * Recibe el Excel en el campo `file` y devuelve el informe de lo que pasaría
 * si se aplicara. NO escribe nada: es un "ensayo". El usuario revisa y recién
 * ahí confirma en /api/admin/precios/aplicar.
 *
 * Separar preview de aplicación es lo que hace segura una actualización masiva:
 * nadie pisa 200 precios sin haberlos visto antes.
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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "No adjuntaste ningún archivo." },
      { status: 400 },
    );
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!(siteConfig.priceList.allowedExtensions as readonly string[]).includes(extension)) {
    return NextResponse.json(
      {
        error: `El archivo tiene que ser ${siteConfig.priceList.allowedExtensions.join(", ")}. Recibimos "${extension || "sin extensión"}".`,
      },
      { status: 400 },
    );
  }

  if (file.size > siteConfig.priceList.maxSizeBytes) {
    const maxMb = Math.round(siteConfig.priceList.maxSizeBytes / 1024 / 1024);
    return NextResponse.json(
      { error: `El archivo supera los ${maxMb} MB.` },
      { status: 400 },
    );
  }

  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  try {
    const preview = buildPricePreview({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      products,
      categories,
    });
    return NextResponse.json(preview);
  } catch (error) {
    // PriceListError trae un mensaje pensado para el usuario; cualquier otra
    // cosa es un bug nuestro y no queremos filtrar el stack trace.
    if (error instanceof PriceListError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error inesperado al parsear la lista de precios:", error);
    return NextResponse.json(
      { error: "No pudimos procesar el archivo." },
      { status: 500 },
    );
  }
}
