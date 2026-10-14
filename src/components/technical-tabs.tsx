"use client";

import { useState } from "react";

import { ProductImage } from "@/components/product-image";
import { useCart } from "@/components/use-cart";
import type { TechnicalSheet } from "@/data/types";
import { formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

export type RelatedLite = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
};

type Tab = "datos" | "uso" | "docs" | "rel";

/**
 * Carpeta técnica de la ficha, en pestañas.
 *
 * Solo la recibe un cliente con sesión: el servidor decide si la renderiza. Las
 * pestañas sin contenido no se muestran, así un producto sin PDF no enseña una
 * pestaña vacía.
 */
export function TechnicalTabs({
  technical,
  related,
  t,
}: {
  technical: TechnicalSheet;
  related: RelatedLite[];
  t: Dictionary["variants"];
}) {
  const { addItem } = useCart();
  const disponibles: { id: Tab; label: string }[] = [
    technical.datos?.length ? { id: "datos" as const, label: t.tabData } : null,
    technical.uso?.length ? { id: "uso" as const, label: t.tabUsage } : null,
    technical.documentos?.length ? { id: "docs" as const, label: t.tabDocs } : null,
    related.length ? { id: "rel" as const, label: t.tabRelated } : null,
  ].filter((x): x is { id: Tab; label: string } => x !== null);

  const [activa, setActiva] = useState<Tab | null>(null);
  if (disponibles.length === 0) return null;
  const tab = activa && disponibles.some((d) => d.id === activa) ? activa : disponibles[0].id;

  return (
    <section className="mt-14 border-t border-line pt-8">
      <h2 className="text-xl font-bold tracking-tight">{t.technicalTitle}</h2>

      <div role="tablist" className="mt-4 flex gap-1 overflow-x-auto border-b border-line">
        {disponibles.map((d) => (
          <button
            key={d.id}
            role="tab"
            type="button"
            aria-selected={tab === d.id}
            onClick={() => setActiva(d.id)}
            className={`relative min-h-11 shrink-0 px-4 text-sm font-semibold transition-colors ${
              tab === d.id ? "text-brand" : "text-ink-soft hover:text-ink"
            }`}
          >
            {d.label}
            <span
              aria-hidden
              className={`absolute inset-x-2 -bottom-px h-0.5 origin-left bg-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                tab === d.id ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </button>
        ))}
      </div>

      {/* key: al cambiar de pestaña el panel se remonta y entra deslizando. */}
      <div key={tab} role="tabpanel" className="animate-fade-up pt-6 [animation-duration:300ms]">
        {tab === "datos" && (
          <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {technical.datos!.map((d) => (
              <div key={d.label} className="bg-card px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{d.label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab === "uso" && (
          <ol className="space-y-3">
            {technical.uso!.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-xs font-bold text-on-brand">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-ink-soft">{paso}</p>
              </li>
            ))}
          </ol>
        )}

        {tab === "docs" && (
          <ul className="space-y-3">
            {technical.documentos!.map((doc) => (
              <li key={doc.url} className="rounded-xl border border-line bg-card">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
                    <span>📄 {doc.label}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="btn-secondary px-3 py-1 text-xs"
                    >
                      {t.download}
                    </a>
                  </summary>
                  {/* La vista previa se carga recién al abrir el <details>. */}
                  <iframe src={doc.url} title={doc.label} loading="lazy" className="h-[32rem] w-full border-t border-line" />
                </details>
              </li>
            ))}
          </ul>
        )}

        {tab === "rel" && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-card">
                <div className="relative aspect-square bg-surface">
                  <ProductImage src={r.image} alt={r.name} />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium">{r.name}</p>
                  <p className="font-mono text-[11px] text-ink-soft">{r.sku}</p>
                  <p className="mt-auto pt-1 font-bold text-accent-text">{formatPrice(r.price)}</p>
                  <button
                    type="button"
                    className="btn-primary mt-2 h-9 text-sm"
                    onClick={() =>
                      addItem({
                        productId: r.id,
                        sku: r.sku,
                        name: r.name,
                        slug: r.slug,
                        price: r.price,
                        image: r.image,
                      })
                    }
                  >
                    {t.addToOrder}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
