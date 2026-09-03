import Link from "next/link";

import type { Dictionary } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { buildInquiryMessage, buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * El "muro de precios".
 *
 * Regla del negocio: cualquiera puede recorrer el catálogo entero —fotos,
 * nombres, códigos, descripciones—, pero los precios y el armado de pedidos
 * son solo para clientes con usuario. Es lo habitual en un mayorista: la lista
 * de precios es información comercial.
 *
 * Estos componentes son Server Components (no llevan "use client"): no tienen
 * estado ni eventos, solo deciden qué HTML mandar según `showPrices`. Eso
 * significa que el precio de un producto NUNCA llega al navegador de quien no
 * inició sesión: no está escondido con CSS, directamente no se envía. Si
 * estuviera oculto con `display:none` alcanzaría con abrir el inspector para
 * verlo.
 */

/** Icono de candado. Chiquito, para acompañar el texto. */
function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function WhatsappIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  );
}

/**
 * El precio, o el cartelito que lo reemplaza.
 *
 * `size="card"` es para la grilla; `size="detail"`, para la ficha del producto.
 */
export function ProductPrice({
  price,
  showPrices,
  t,
  size = "card",
}: {
  price: number;
  showPrices: boolean;
  t: Dictionary;
  size?: "card" | "detail";
}) {
  if (showPrices) {
    return (
      <p
        className={
          size === "detail"
            ? "text-3xl font-bold text-brand"
            : "text-lg font-bold text-brand"
        }
      >
        {formatPrice(price)}
      </p>
    );
  }

  return (
    <p
      className={`flex items-center gap-1.5 font-semibold text-ink-soft ${
        size === "detail" ? "text-base" : "text-xs"
      }`}
    >
      <LockIcon className={size === "detail" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {t.gate.priceHidden}
    </p>
  );
}

/**
 * Botón para preguntar por un producto por WhatsApp.
 *
 * Es la salida que le queda a quien no tiene usuario: el mensaje se abre con
 * el nombre y el código ya escritos, así el vendedor sabe de qué artículo le
 * hablan sin ida y vuelta.
 */
export function WhatsappInquiryButton({
  productName,
  sku,
  whatsappNumber,
  t,
  className = "",
  variant = "outline",
}: {
  productName: string;
  sku: string;
  whatsappNumber: string;
  t: Dictionary;
  className?: string;
  variant?: "outline" | "solid";
}) {
  const url = buildWhatsappUrl(
    whatsappNumber,
    buildInquiryMessage({ intro: t.gate.inquiryMessage, productName, sku }),
  );

  const styles =
    variant === "solid"
      ? "bg-[#25D366] text-white hover:brightness-95"
      : "border border-line bg-card text-ink hover:border-[#25D366] hover:text-[#128C7E]";

  return (
    <a
      href={url}
      target="_blank"
      // noopener corta el acceso de la pestaña nueva a la nuestra; noreferrer
      // además evita mandarle a WhatsApp de qué página venimos.
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${styles} ${className}`}
    >
      <WhatsappIcon />
      {t.gate.askByWhatsapp}
    </a>
  );
}

/**
 * Cartel que explica por qué no se ven los precios.
 *
 * Va una sola vez arriba del listado, no en cada ficha: repetir el mismo aviso
 * veinte veces en la misma pantalla cansa y no informa más.
 */
export function PriceGateBanner({ t }: { t: Dictionary }) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-xl border border-brand/25 bg-brand-soft p-5 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
        <LockIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold">{t.gate.bannerTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {t.gate.bannerText}
        </p>
      </div>

      <Link
        href="/login"
        className="shrink-0 rounded-md bg-brand px-5 py-2.5 text-center text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
      >
        {t.gate.bannerButton}
      </Link>
    </aside>
  );
}
