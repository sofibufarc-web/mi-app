import Link from "next/link";

import { CheckoutForm } from "@/components/checkout-form";
import { getStoreConfig } from "@/lib/data-source";

export const metadata = { title: "Finalizar pedido" };

/**
 * Página del checkout. Es Server Component: lee la config de la tienda (nombre
 * y número de WhatsApp) y se la pasa como props al formulario, que sí es
 * cliente porque necesita el carrito de localStorage.
 */
export default async function CheckoutPage() {
  const config = await getStoreConfig();

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/carrito" className="hover:text-brand">
          Carrito
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Finalizar pedido</span>
      </nav>

      <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Finalizar pedido
      </h1>

      <CheckoutForm
        storeName={config.storeName}
        whatsappNumber={config.whatsappNumber}
      />
    </div>
  );
}
