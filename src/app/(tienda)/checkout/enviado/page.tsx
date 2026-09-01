import Link from "next/link";

import { getStoreConfig } from "@/lib/data-source";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export const metadata = { title: "Pedido enviado" };

/**
 * Pantalla de confirmación. El carrito ya se vació en el paso anterior
 * (`CheckoutForm`), así que acá solo mostramos el mensaje.
 */
export default async function PedidoEnviadoPage() {
  const config = await getStoreConfig();

  return (
    <div className="container-wiedmer py-20">
      <div className="mx-auto max-w-lg rounded-lg border border-line p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-7 w-7 text-green-600"
          >
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">¡Pedido enviado!</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Abrimos WhatsApp con tu pedido cargado. Si no se abrió solo, revisá que
          el navegador no haya bloqueado la ventana emergente y escribinos
          directamente.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Te contactamos para confirmar disponibilidad, forma de pago y entrega.
          Nuestro horario es {config.contact.hours.toLowerCase()}.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Seguir comprando
          </Link>
          <a
            href={`https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line px-6 py-3 text-sm font-semibold transition hover:bg-surface"
          >
            Abrir WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
