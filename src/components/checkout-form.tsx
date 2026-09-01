"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/use-cart";
import type { Customer } from "@/data/types";
import { formatPrice } from "@/lib/format";
import { buildOrderMessage, buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * Checkout SIN pago.
 *
 * Al confirmar:
 *   1. Armamos el mensaje de texto del pedido (`buildOrderMessage`).
 *   2. Abrimos `https://wa.me/<numero>?text=…` en una pestaña nueva.
 *   3. Vaciamos el carrito y vamos a la pantalla de confirmación.
 *
 * Detalle importante: `window.open` tiene que dispararse en el mismo tick del
 * click del usuario, si no el navegador lo bloquea como popup. Por eso no hay
 * ningún `await` antes de abrirlo.
 */
export function CheckoutForm({
  storeName,
  whatsappNumber,
}: {
  storeName: string;
  whatsappNumber: string;
}) {
  const router = useRouter();
  const { items, totalPrice, totalItems, ready, clear } = useCart();

  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    address: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof Customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!customer.name.trim()) {
      setError("Necesitamos tu nombre para identificar el pedido.");
      return;
    }
    if (items.length === 0) {
      setError("El carrito está vacío.");
      return;
    }

    const message = buildOrderMessage({
      storeName,
      customer: {
        name: customer.name.trim(),
        email: customer.email?.trim() || undefined,
        address: customer.address?.trim() || undefined,
        note: customer.note?.trim() || undefined,
      },
      items,
      total: totalPrice,
    });

    window.open(buildWhatsappUrl(whatsappNumber, message), "_blank", "noopener");

    clear();
    router.push("/checkout/enviado");
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
        <p className="font-semibold">No hay nada para pedir todavía</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="rounded-lg border border-line p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Tus datos</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Con esto armamos el pedido y te contactamos por WhatsApp para cerrarlo.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-soft">
              Nombre o razón social *
            </span>
            <input
              required
              value={customer.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Pinturería San Martín"
              className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">Email</span>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="compras@ejemplo.com"
              className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">
              Dirección de entrega
            </span>
            <input
              value={customer.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="San Martín 1234, Rosario"
              className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-soft">
              Nota para el pedido
            </span>
            <textarea
              rows={3}
              value={customer.note}
              onChange={(e) => updateField("note", e.target.value)}
              placeholder="Horario de entrega, forma de pago, aclaraciones…"
              className="rounded-md border border-line p-3 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      <aside className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-40">
        <h2 className="text-sm font-bold uppercase tracking-wide">Tu pedido</h2>

        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span className="min-w-0 text-ink-soft">
                <span className="font-semibold text-ink">{item.quantity}×</span>{" "}
                {item.name}
              </span>
              <span className="shrink-0 font-medium">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-line pt-4">
          <span className="font-bold">Total ({totalItems})</span>
          <span className="text-xl font-bold text-brand">
            {formatPrice(totalPrice)}
          </span>
        </div>

        <button
          type="submit"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-3 text-sm font-bold text-white transition hover:brightness-95"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
          </svg>
          Enviar pedido por WhatsApp
        </button>

        <p className="mt-3 text-xs text-ink-soft">
          Se abre WhatsApp con el pedido ya escrito. No se cobra nada acá: el pago
          se coordina con el vendedor.
        </p>
      </aside>
    </form>
  );
}
