import { siteConfig } from "@/config/site";
import type { CartItem, Customer } from "@/data/types";
import { formatOrderNumber, formatPrice } from "@/lib/format";

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
  items: Array<Pick<CartItem, "name" | "sku" | "price" | "quantity">>;
  total: number;
  /** Número con el que quedó registrado en el panel. Sin él, el título es genérico. */
  orderNumber?: number;
}): string {
  const { storeName, customer, items, total, orderNumber } = params;
  const lines: string[] = [];
  // Línea separadora. Es un carácter común (no un emoji), así que se ve igual
  // en Android, iPhone y WhatsApp Web.
  const separador = "━━━━━━━━━━━━━━━";

  lines.push(
    orderNumber
      ? `🧾 *PEDIDO N° ${formatOrderNumber(orderNumber)} — ${storeName.toUpperCase()}*`
      : `🧾 *NUEVO PEDIDO — ${storeName.toUpperCase()}*`,
  );
  lines.push("");
  lines.push(`👤 *Cliente:* ${customer.name}`);
  if (customer.email) lines.push(`✉️ *Email:* ${customer.email}`);
  if (customer.address) lines.push(`📍 *Dirección:* ${customer.address}`);
  lines.push("");
  lines.push(`📦 *Productos (${items.length})*`);
  lines.push(separador);

  items.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    lines.push(`*${index + 1}.* ${item.name}`);
    lines.push(`      Cód. ${item.sku}`);
    lines.push(
      `      ${item.quantity} × ${formatPrice(item.price)} = *${formatPrice(subtotal)}*`,
    );
    if (index < items.length - 1) lines.push("");
  });

  lines.push(separador);
  lines.push(`💰 *TOTAL: ${formatPrice(total)}*`);

  if (customer.note) {
    lines.push("");
    lines.push(`📝 _${customer.note}_`);
  }

  // El link al final hace que WhatsApp muestre la tarjeta con el logo de la
  // empresa (la imagen de `src/app/opengraph-image.tsx`) debajo del pedido.
  lines.push("");
  lines.push(siteConfig.url);

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
