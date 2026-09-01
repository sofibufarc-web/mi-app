"use client";

import { useState } from "react";

import { ProductImage } from "@/components/product-image";

/**
 * Galería de la ficha de producto: imagen grande + miniaturas.
 *
 * Es cliente porque necesita recordar cuál miniatura está seleccionada
 * (`useState`). Si el producto no tiene imágenes, `ProductImage` dibuja el
 * placeholder y no mostramos miniaturas.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface">
        <ProductImage
          src={images[active]}
          alt={alt}
          sizes="(min-width: 1024px) 40vw, 100vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-surface transition ${
                index === active
                  ? "border-brand ring-1 ring-brand"
                  : "border-line hover:border-brand/40"
              }`}
            >
              <ProductImage src={image} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
