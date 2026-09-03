import type { CartItem, Customer } from "@/data/types";
import { formatPrice } from "@/lib/format";

/**
 * Arma el mensaje de WhatsApp del pedido y la URL para abrirlo.
 *
 * WhatsApp interpreta un markdown mínimo: *negrita*, _cursiva_, ~tachado~.
 * Lo usamos para que el pedido se lea prolijo en el celular del vendedor.
 *
 * Este archivo NO importa nada de servidor a propósito: lo usa el componente
 * de checkout, que corre en el navegador.
 */

export function buildOrderMessage(params: {
  storeName: string;
  customer: Customer;
  items: CartItem[];
  total: number;
}): string {
  const { storeName, customer, items, total } = params;
  const lines: string[] = [];

  lines.push(`*NUEVO PEDIDO — ${storeName.toUpperCase()}*`);
  lines.push("");
  lines.push(`*Cliente:* ${customer.name}`);
  if (customer.email) lines.push(`*Email:* ${customer.email}`);
  if (customer.address) lines.push(`*Dirección:* ${customer.address}`);
  lines.push("");
  lines.push("*Productos:*");

  items.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(
      `   Cód. ${item.sku} · ${item.quantity} x ${formatPrice(item.price)} = ${formatPrice(subtotal)}`,
    );
  });

  lines.push("");
  lines.push(`*TOTAL: ${formatPrice(total)}*`);

  if (customer.note) {
    lines.push("");
    lines.push(`_Nota:_ ${customer.note}`);
  }

  return lines.join("\n");
}

/**
 * Mensaje para consultar el precio de UN producto.
 *
 * Lo usa el visitante que todavía no inició sesión: no ve los precios, pero
 * puede preguntar por uno concreto sin tener que copiar el código a mano.
 *
 * `intro` viene traducido desde el diccionario (`t.gate.inquiryMessage`), así
 * que la consulta le llega al vendedor en el idioma en el que el cliente
 * estaba navegando.
 */
export function buildInquiryMessage(params: {
  intro: string;
  productName: string;
  sku: string;
}): string {
  const { intro, productName, sku } = params;
  return `${intro}\n\n*${productName}*\nCód. ${sku}`;
}

/**
 * Deja el número como lo quiere wa.me: solo dígitos, con código de país.
 * "+54 9 341 675-6969" → "5493416756969"
 */
export function normalizeWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsappUrl(number: string, message: string): string {
  // encodeURIComponent escapa espacios, saltos de línea y acentos para que
  // viajen sanos dentro de la URL.
  return `https://wa.me/${normalizeWhatsappNumber(number)}?text=${encodeURIComponent(message)}`;
}
