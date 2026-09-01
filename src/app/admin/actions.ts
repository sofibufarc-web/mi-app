"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProductInput } from "@/data/types";
import { parsePriceValue } from "@/lib/price-parse";
import {
  deleteCategory,
  deleteProduct,
  updateStoreConfig,
  upsertCategory,
  upsertProduct,
} from "@/lib/data-source";

/**
 * Server Actions del panel: todo lo que ESCRIBE datos pasa por acá.
 *
 * Patrón que se repite en cada action:
 *   1. Leer y validar el FormData.
 *   2. Llamar a la capa de datos (`@/lib/data-source`).
 *   3. `revalidatePath` para que las páginas ya renderizadas se refresquen.
 *   4. Devolver un estado con el error, o `redirect` si salió todo bien.
 *
 * `revalidatePath("/", "layout")` invalida la caché de TODA la app: como un
 * cambio de precio afecta a la home, a la categoría y a la ficha, es más simple
 * y seguro que enumerar rutas una por una.
 */

export type FormState = { error: string | null; ok?: boolean; message?: string };

/* -------------------------------------------------------------------------- */
/* Helpers de lectura de FormData                                              */
/* -------------------------------------------------------------------------- */

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/** Los checkbox no aparecen en el FormData cuando están desmarcados. */
function bool(formData: FormData, field: string): boolean {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

export async function saveProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const sku = text(formData, "sku");

  if (!name) return { error: "El nombre es obligatorio." };
  if (!sku) return { error: "El código (SKU) es obligatorio." };

  // Reusamos el mismo parser que la carga por Excel: acepta "89900",
  // "89.900,50" y "$ 89.900".
  const price = parsePriceValue(text(formData, "price"));
  if (price === null) {
    return { error: "El precio tiene que ser un número mayor o igual a 0." };
  }

  const stockRaw = text(formData, "stock");
  const stock = stockRaw === "" ? null : Number(stockRaw);
  if (stock !== null && !Number.isFinite(stock)) {
    return { error: "El stock tiene que ser un número (o quedar vacío)." };
  }

  // Las imágenes llegan como JSON en un input oculto: el uploader las sube por
  // separado a /api/admin/upload y guarda acá los paths, ya ordenados.
  let images: string[] = [];
  try {
    const parsed = JSON.parse(text(formData, "images") || "[]");
    if (Array.isArray(parsed)) images = parsed.filter((i) => typeof i === "string");
  } catch {
    images = [];
  }

  const input: ProductInput = {
    ...(id ? { id } : {}),
    name,
    sku,
    description: String(formData.get("description") ?? "").trim(),
    price,
    categoryId: text(formData, "categoryId"),
    brand: text(formData, "brand") || undefined,
    unit: text(formData, "unit") || undefined,
    stock,
    featured: bool(formData, "featured"),
    active: bool(formData, "active"),
    images,
  };

  try {
    await upsertProduct(input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/productos?guardado=1");
}

export async function deleteProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id");
  if (!id) return { error: "Falta el id del producto." };

  try {
    await deleteProduct(id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo borrar." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/productos?borrado=1");
}

/* -------------------------------------------------------------------------- */
/* Categorías                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) return { error: "El nombre de la categoría es obligatorio." };

  const orderRaw = text(formData, "order");
  const order = orderRaw === "" ? 99 : Number(orderRaw);
  if (!Number.isFinite(order)) return { error: "El orden tiene que ser un número." };

  try {
    await upsertCategory({
      ...(id ? { id } : {}),
      name,
      description: text(formData, "description") || undefined,
      image: text(formData, "image") || undefined,
      order,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true, message: "Categoría guardada." };
}

/**
 * Borrado de categoría en dos pasos.
 *
 * Primero se llama SIN `confirm`: si la categoría tiene productos, no se borra
 * nada y se devuelve un mensaje para que la UI pida confirmación. El segundo
 * intento llega con `confirm=1` y con `reassignTo` (el id de la categoría
 * destino, o vacío para dejar los productos "sin categoría").
 */
export async function deleteCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id");
  if (!id) return { error: "Falta el id de la categoría." };

  const confirmed = bool(formData, "confirm");
  const reassignTo = text(formData, "reassignTo");

  const result = await deleteCategory(
    id,
    confirmed ? { reassignTo } : {},
  );

  if (!result.ok) {
    return {
      error: `Esta categoría tiene ${result.productCount} producto(s). Elegí a dónde moverlos y confirmá.`,
    };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true, message: "Categoría eliminada." };
}

/* -------------------------------------------------------------------------- */
/* Configuración de la tienda                                                  */
/* -------------------------------------------------------------------------- */

export async function saveStoreConfigAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const storeName = text(formData, "storeName");
  const whatsappNumber = text(formData, "whatsappNumber").replace(/\D/g, "");

  if (!storeName) return { error: "El nombre de la tienda es obligatorio." };
  if (whatsappNumber.length < 10) {
    return {
      error:
        "El WhatsApp tiene que incluir código de país y área, sin espacios. Ej: 5493416756969",
    };
  }

  try {
    await updateStoreConfig({
      storeName,
      logoText: text(formData, "logoText") || storeName.toUpperCase(),
      logoImage: text(formData, "logoImage") || undefined,
      whatsappNumber,
      welcomeTitle: text(formData, "welcomeTitle"),
      welcomeText: text(formData, "welcomeText"),
      contact: {
        address: text(formData, "address"),
        phone: text(formData, "phone"),
        email: text(formData, "email"),
        hours: text(formData, "hours"),
      },
      colors: {
        brand: text(formData, "brand"),
        brandDark: text(formData, "brandDark"),
        brandDarker: text(formData, "brandDarker"),
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true, message: "Configuración guardada." };
}
