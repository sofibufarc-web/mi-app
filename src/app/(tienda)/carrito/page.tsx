import Link from "next/link";

import { CartView } from "@/components/cart-view";
import { getT } from "@/lib/request-context";

export const metadata = { title: "Carrito" };

/**
 * El acceso ya está controlado por `src/proxy.ts`: /carrito exige sesión, así
 * que si el request llegó hasta acá el visitante puede ver precios.
 */
export default async function CarritoPage() {
  const t = await getT();

  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="transition hover:text-brand">
          {t.common.home}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{t.common.cart}</span>
      </nav>

      <h1 className="animate-fade-up mt-3 mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        {t.cart.title}
      </h1>

      <CartView t={t} />
    </div>
  );
}
