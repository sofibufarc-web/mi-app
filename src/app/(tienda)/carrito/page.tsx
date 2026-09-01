import Link from "next/link";

import { CartView } from "@/components/cart-view";

export const metadata = { title: "Carrito" };

export default function CarritoPage() {
  return (
    <div className="container-wiedmer py-8">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Carrito</span>
      </nav>

      <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Tu pedido
      </h1>

      <CartView />
    </div>
  );
}
