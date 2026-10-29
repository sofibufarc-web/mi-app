"use client";

import Link from "next/link";
import { useState, ViewTransition } from "react";

import { ProductImage } from "@/components/product-image";

type Swatch = { color: string; hex?: string; image?: string };

/**
 * Foto de la tarjeta + muestras de color.
 *
 * Es cliente solo por una cosa: al pasar el mouse por un círculo de color, la
 * foto cambia a la de ese color (si esa variante tiene foto propia). Todo lo
 * demás de la tarjeta es de servidor.
 *
 * El `<ViewTransition>` con el mismo `name` que usa la ficha es lo que hace que
 * la foto "vuele" de la tarjeta a la ficha al navegar.
 */
export function ParentCardMedia({
  href,
  name,
  transitionName,
  image,
  swatches,
  brand,
  viewLabel,
  outOfStockLabel,
}: {
  href: string;
  name: string;
  transitionName: string;
  image?: string;
  swatches: Swatch[];
  brand?: string;
  viewLabel: string;
  /** Texto "Sin stock"; si viene, se dibuja la etiqueta y se atenúa la foto. */
  outOfStockLabel?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = hover ?? image;

  return (
    <>
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-surface"
        aria-label={name}
      >
        <ViewTransition name={transitionName} share="morph" default="none">
          <div
            className={`absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 ${
              outOfStockLabel ? "opacity-60" : ""
            }`}
          >
            <ProductImage src={shown} alt={name} />
          </div>
        </ViewTransition>

        {outOfStockLabel && (
          <span className="absolute right-2 top-2 rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-page">
            {outOfStockLabel}
          </span>
        )}

        {brand && (
          <span className="absolute left-2 top-2 rounded bg-card/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand shadow-sm">
            {brand}
          </span>
        )}

        {/* El botón aparece al pasar el mouse. En pantallas táctiles no hay
            hover: ahí toda la tarjeta es el enlace. */}
        <span className="btn-primary absolute inset-x-3 bottom-3 translate-y-3 px-3 py-2 text-xs opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {viewLabel} <span className="btn-arrow">→</span>
        </span>
      </Link>

      {swatches.length > 0 && (
        <ul className="flex flex-wrap gap-1 px-3 pt-3" aria-label="Colores">
          {swatches.slice(0, 10).map((s) => (
            <li key={s.color}>
              <span
                title={s.color}
                onMouseEnter={() => s.image && setHover(s.image)}
                onMouseLeave={() => setHover(null)}
                className="block h-4 w-4 rounded-full border border-black/15"
                style={{ background: s.hex ?? "#ccc" }}
              />
            </li>
          ))}
          {swatches.length > 10 && (
            <li className="text-[11px] leading-4 text-ink-soft">+{swatches.length - 10}</li>
          )}
        </ul>
      )}
    </>
  );
}
