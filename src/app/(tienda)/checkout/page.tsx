import Link from "next/link";

import { CheckoutForm } from "@/components/checkout-form";
import { getStoreConfig } from "@/lib/data-source";
import { getT } from "@/lib/request-context";

export const metadata = { title: "Finalizar pedido" };

/**
 * Página del checkout. Es Server Component: lee la config de la tienda (nombre
 * y número de WhatsApp) y se la pasa como props al formulario, que sí es
 * cliente porque necesita el carrito de localStorage.
 *
 * El acceso lo controla `src/proxy.ts`, igual que /carrito.
 */
export default async function CheckoutPage() {
  const [config, t] = await Promise.all([getStoreConfig(), getT()]);

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/carrito" className="transition hover:text-brand">
          {t.common.cart}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{t.checkout.title}</span>
      </nav>

      <h1 className="animate-fade-up mt-3 mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        {t.checkout.title}
      </h1>

      <CheckoutForm
        t={t}
        storeName={config.storeName}
        whatsappNumber={config.whatsappNumber}
      />
    </div>
  );
}
