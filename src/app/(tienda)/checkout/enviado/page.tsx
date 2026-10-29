import Link from "next/link";

import { getStoreConfig } from "@/lib/data-source";
import { formatOrderNumber } from "@/lib/format";
import { getT } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export const metadata = { title: "Pedido enviado", robots: { index: false } };

/**
 * Pantalla de confirmación. El carrito ya se vació en el paso anterior
 * (`CheckoutForm`), así que acá solo mostramos el mensaje.
 */
export default async function PedidoEnviadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [config, t, query] = await Promise.all([getStoreConfig(), getT(), searchParams]);

  // `?pedido=12` lo pone el checkout cuando el pedido quedó registrado. Es solo
  // para mostrarlo: se acepta únicamente si son dígitos.
  const pedido = typeof query.pedido === "string" && /^\d{1,9}$/.test(query.pedido)
    ? Number(query.pedido)
    : null;

  return (
    <div className="container-wiedmer py-20">
      <div className="animate-fade-up mx-auto max-w-lg rounded-2xl border border-line bg-card p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
          >
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {t.checkout.sentTitle}
        </h1>
        {pedido && (
          <p className="mt-2 font-mono text-sm font-semibold text-brand">
            {t.checkout.sentNumber} {formatOrderNumber(pedido)}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {t.checkout.sentText}
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {t.checkout.sentContact} {config.contact.hours.toLowerCase()}.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
          >
            {t.common.viewCatalog}
          </Link>
          <a
            href={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line px-6 py-3 text-sm font-semibold transition hover:bg-surface"
          >
            {t.common.whatsapp}
          </a>
        </div>
      </div>
    </div>
  );
}
