"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { ProductInput, Role } from "@/data/types";
import { parsePriceValue } from "@/lib/price-parse";
import {
  confirmUserEmail,
  countActiveAdmins,
  deleteCategory,
  deleteProduct,
  deleteUser,
  getUserByEmail,
  getUserById,
  setUserActive,
  setUserRole,
  updateStoreConfig,
  upsertCategory,
  upsertProduct,
} from "@/lib/data-source";
import { createAuthUser, sendPasswordReset } from "@/lib/supabase/admin";
import { getSession } from "@/lib/request-context";
import type { Session } from "@/lib/auth";

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

/* -------------------------------------------------------------------------- */
/* Usuarios                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Quién puede entrar a la tienda y al panel.
 *
 * Tres reglas se validan ACÁ, en el servidor, y no escondiendo botones en la
 * pantalla: esconder un botón no impide que alguien mande el formulario a mano.
 *
 *   1. Nadie se puede borrar ni desactivar a sí mismo.
 *   2. No puede quedar la tabla sin ningún admin activo.
 *   3. La contraseña tiene ocho caracteres como mínimo.
 *
 * La 2 es la importante: sin ningún admin, la única forma de volver a entrar al
 * panel sería abrir la terminal y correr `npm run db:usuario`.
 *
 * Las cuentas viven en **Supabase Auth**; el rol, en la tabla `profiles`. Por eso
 * un alta son tres pasos y no un INSERT: crear la cuenta, confirmarle el email
 * (la está dando de alta un admin, no hace falta que espere un correo) y ponerle
 * el rol al perfil que el trigger de la base ya creó.
 */

const LARGO_MINIMO_PASSWORD = 8;

/**
 * Segunda cerradura: ¿quien está llamando es admin, hoy, según la base?
 *
 * `src/proxy.ts` ya cortó el paso a `/admin/*`, y estas actions se postean a esa
 * ruta. Pero una Server Action es un endpoint como cualquier otro, y estas en
 * particular pueden crear un admin nuevo: si alguna vez cambia el matcher del
 * proxy o se mueve la pantalla de lugar, la puerta quedaría abierta. Preguntar
 * de nuevo cuesta una consulta y no depende de dónde esté la página.
 *
 * `getSession()` ya resuelve el rol contra la base en cada request, así que esto
 * no repite trabajo caro: `cache()` de React devuelve el resultado ya calculado.
 */
async function exigirAdmin(): Promise<{ session: Session } | { error: string }> {
  const session = await getSession();
  const usuario = session ? await getUserById(session.userId) : null;

  if (!session || !usuario || !usuario.active || usuario.role !== "admin") {
    return { error: "No tenés permiso para hacer esto." };
  }
  return { session };
}

function validarPassword(password: string): string | null {
  if (password.length < LARGO_MINIMO_PASSWORD) {
    return `La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
  }
  return null;
}

/** El rol tal como llega del formulario, verificado contra los dos válidos. */
function leerRol(formData: FormData): Role | null {
  const valor = text(formData, "role");
  return valor === "admin" || valor === "cliente" ? valor : null;
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const permiso = await exigirAdmin();
  if ("error" in permiso) return { error: permiso.error };

  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = leerRol(formData);

  if (!email) return { error: "El email es obligatorio." };
  if (role === null) return { error: "Elegí un rol válido." };

  const problema = validarPassword(password);
  if (problema) return { error: problema };

  /*
   * El duplicado se chequea acá y no se espera a que Supabase lo rechace.
   *
   * Cuando la confirmación por email está activada, Supabase responde "todo
   * bien" aunque la cuenta ya exista: es a propósito, para que nadie pueda
   * averiguar qué direcciones están registradas probando altas. Como nosotros sí
   * podemos leer `profiles`, preguntamos ahí.
   */
  if (await getUserByEmail(email)) {
    return { error: `Ya existe una cuenta con el email "${email}".` };
  }

  const creada = await createAuthUser(email, password);
  if ("error" in creada) {
    return { error: `No se pudo crear la cuenta: ${creada.error}` };
  }

  // El perfil ya existe (lo creó el trigger `on_auth_user_created` con rol
  // "cliente"); solo falta corregirle el rol si se pidió admin.
  await confirmUserEmail(creada.id);
  await setUserRole(creada.id, role);

  revalidatePath("/admin/usuarios");
  return { error: null, ok: true, message: `Cuenta "${email}" creada.` };
}

/**
 * Manda el mail de "restablecer contraseña".
 *
 * Reemplaza al viejo "cambiarle la contraseña a este usuario", que ya no es
 * posible: las contraseñas las guarda Supabase Auth y ponerle una a otra cuenta
 * exige la clave secreta del proyecto.
 *
 * Y está bien que no se pueda. La contraseña de una persona no debería pasar
 * nunca por las manos de otra, ni siquiera las del admin. El mail lleva un link
 * de un solo uso que la lleva a elegirla ella misma.
 *
 * ⚠️ El servidor de correo que Supabase trae por defecto manda muy pocos mails
 * por hora y solo a integrantes del proyecto. Para usarlo con clientes reales
 * hay que configurar un SMTP propio en el panel de Supabase.
 */
export async function sendPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const permiso = await exigirAdmin();
  if ("error" in permiso) return { error: permiso.error };

  const id = text(formData, "id");
  const usuario = await getUserById(id);
  if (!usuario) return { error: "Esa cuenta ya no existe." };

  // A dónde lleva el link del mail. Se arma con el host de este mismo request
  // para que funcione igual en localhost y en el dominio de producción, sin una
  // variable de entorno más que mantener.
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const destino = `${protocolo}://${host}/actualizar-password`;

  const { error } = await sendPasswordReset(usuario.email, destino);
  if (error) return { error: `No se pudo enviar el mail: ${error}` };

  return {
    error: null,
    ok: true,
    message: `Le mandamos a "${usuario.email}" un link para elegir una contraseña nueva.`,
  };
}

export async function toggleUserActiveAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const permiso = await exigirAdmin();
  if ("error" in permiso) return { error: permiso.error };

  const id = text(formData, "id");
  const active = bool(formData, "active");

  if (permiso.session.userId === id) {
    return { error: "No podés desactivar tu propio usuario." };
  }

  const usuario = await getUserById(id);
  if (!usuario) return { error: "Esa cuenta ya no existe." };

  // Solo hace falta contar si estamos SACANDO un admin.
  if (!active && usuario.role === "admin" && (await countActiveAdmins(id)) === 0) {
    return { error: "Es el único admin activo. Creá otro antes de desactivarlo." };
  }

  await setUserActive(id, active);

  revalidatePath("/admin/usuarios");
  return {
    error: null,
    ok: true,
    message: active
      ? `"${usuario.email}" puede volver a entrar.`
      : `"${usuario.email}" ya no puede iniciar sesión.`,
  };
}

export async function deleteUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const permiso = await exigirAdmin();
  if ("error" in permiso) return { error: permiso.error };

  const id = text(formData, "id");

  if (permiso.session.userId === id) {
    return { error: "No podés borrar tu propio usuario." };
  }

  const usuario = await getUserById(id);
  if (!usuario) return { error: "Esa cuenta ya no existe." };

  if (usuario.role === "admin" && (await countActiveAdmins(id)) === 0) {
    return { error: "Es el único admin activo. Creá otro antes de borrarlo." };
  }

  await deleteUser(id);

  revalidatePath("/admin/usuarios");
  return { error: null, ok: true, message: `Cuenta "${usuario.email}" eliminada.` };
}
