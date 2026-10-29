"use server";

import type { OrderLine } from "@/data/types";
import { canSeePrices } from "@/lib/auth";
import { createOrder, getProductsByIds } from "@/lib/data-source";
import { getLocale, getSession } from "@/lib/request-context";

/**
 * Registro de pedidos.
 *
 * El checkout sigue siendo "armar un mensaje y abrir WhatsApp": nada se cobra.
 * Esta action se llama JUSTO ANTES de abrir WhatsApp y deja una copia del pedido
 * en la base, para verla en `/admin/pedidos`. Ver `CheckoutForm`.
 *
 * ## No se le cree nada al navegador (salvo qué y cuánto)
 *
 * Una Server Action es un POST que cualquiera puede armar a mano, sin pasar por
 * el formulario. Si confiáramos en los precios que manda el navegador, alguien
 * podría registrar un pedido de 100 rodillos a $1. Por eso del cliente solo se
 * toma `productId` y `quantity`; el nombre, el código y el precio se leen de la
 * base acá. El resultado vuelve al formulario, que arma el mensaje de WhatsApp
 * con ESOS datos: lo que se guarda y lo que se manda son siempre lo mismo.
 *
 * ## Si algo falla, la venta no se frena
 *
 * El registro es un extra. Si esta action devuelve `ok: false` (la base no
 * contesta, un producto salió del catálogo), el formulario manda el pedido por
 * WhatsApp igual, con lo que tiene en el carrito, tal como funcionaba antes.
 * Un cliente no tiene que perder su pedido por un problema nuestro.
 */

export type PlaceOrderInput = {
  customer: { name: string; email?: string; address?: string; note?: string };
  items: Array<{ productId: string; quantity: number }>;
};

export type PlaceOrderResult =
  | { ok: true; number: number; items: OrderLine[]; total: number }
  | { ok: false; error: string };

const MAX_LINEAS = 100;
const MAX_CANTIDAD = 99_999;

/** Texto de una sola línea, sin caracteres de control, con tope de largo. */
function linea(valor: unknown, max: number): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

/** Texto libre (la nota): conserva los saltos de línea. */
function parrafo(valor: unknown, max: number): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  // Solo quien puede ver precios arma pedidos (es lo que también exige el proxy
  // para /checkout, pero el proxy no cubre una llamada directa a esta action).
  const session = await getSession();
  if (!session || !canSeePrices(session.role)) {
    return { ok: false, error: "Hay que iniciar sesión para hacer un pedido." };
  }

  const nombre = linea(input?.customer?.name, 120);
  if (!nombre) return { ok: false, error: "Falta el nombre." };
  const customer = {
    name: nombre,
    email: linea(input.customer.email, 160) || undefined,
    address: linea(input.customer.address, 200) || undefined,
    note: parrafo(input.customer.note, 1000) || undefined,
  };

  // Se juntan los renglones repetidos del mismo producto.
  const cantidades = new Map<string, number>();
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "El pedido está vacío." };
  }
  for (const item of input.items.slice(0, MAX_LINEAS)) {
    const id = linea(item?.productId, 40);
    const cantidad = Number(item?.quantity);
    if (!id || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      return { ok: false, error: "Hay un producto con datos inválidos." };
    }
    cantidades.set(id, (cantidades.get(id) ?? 0) + cantidad);
  }

  try {
    // `getProductsByIds` devuelve solo productos ACTIVOS.
    const productos = await getProductsByIds([...cantidades.keys()]);
    const porId = new Map(productos.map((p) => [p.id, p]));

    const items: OrderLine[] = [];
    for (const [productId, quantity] of cantidades) {
      const producto = porId.get(productId);
      if (!producto) {
        return { ok: false, error: "Algún producto ya no está disponible." };
      }
      items.push({
        productId,
        sku: producto.sku,
        name: producto.name,
        price: producto.price,
        quantity,
      });
    }

    // Redondeo a centavos para que la suma de decimales de JavaScript
    // (0.1 + 0.2) no deje un 0,30000000000000004 en la base.
    const total =
      Math.round(items.reduce((suma, l) => suma + l.price * l.quantity, 0) * 100) / 100;

    const number = await createOrder({ customer, items, total, locale: await getLocale() });
    return { ok: true, number, items, total };
  } catch (error) {
    console.error("[pedidos] no se pudo registrar el pedido:", error);
    return { ok: false, error: "No se pudo registrar el pedido." };
  }
}
