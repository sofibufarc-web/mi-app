"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/use-cart";
import type { Customer } from "@/data/types";
import { formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
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
  t,
}: {
  storeName: string;
  whatsappNumber: string;
  t: Dictionary;
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
      setError(t.checkout.errorName);
      return;
    }
    if (items.length === 0) {
      setError(t.checkout.errorEmpty);
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

  const fieldClass =
    "h-11 rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition focus:border-brand";

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="font-semibold">{t.checkout.nothingYet}</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
        >
          {t.common.viewCatalog}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {t.checkout.yourData}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{t.checkout.dataHint}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-soft">
              {t.checkout.name}
            </span>
            <input
              required
              value={customer.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t.checkout.namePlaceholder}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">
              {t.checkout.email}
            </span>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder={t.checkout.emailPlaceholder}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ink-soft">
              {t.checkout.address}
            </span>
            <input
              value={customer.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder={t.checkout.addressPlaceholder}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-soft">
              {t.checkout.note}
            </span>
            <textarea
              rows={3}
              value={customer.note}
              onChange={(e) => updateField("note", e.target.value)}
              placeholder={t.checkout.notePlaceholder}
              className="rounded-md border border-line bg-card p-3 text-sm text-ink outline-none transition focus:border-brand"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="animate-fade-up mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>

      <aside className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-40">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {t.checkout.yourOrder}
        </h2>

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
          <span className="font-bold">
            {t.cart.total} ({totalItems})
          </span>
          <span className="text-xl font-bold text-brand">
            {formatPrice(totalPrice)}
          </span>
        </div>

        <button
          type="submit"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:brightness-95"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
          </svg>
          {t.checkout.send}
        </button>

        <p className="mt-3 text-xs text-ink-soft">{t.checkout.sendHint}</p>
      </aside>
    </form>
  );
}
