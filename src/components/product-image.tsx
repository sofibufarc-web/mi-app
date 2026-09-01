import Image from "next/image";

/**
 * Imagen de producto con placeholder de marca.
 *
 * Los datos de ejemplo no traen fotos: en vez de mostrar un cuadro roto,
 * dibujamos un SVG con las iniciales del producto sobre el gris de la marca.
 * Cuando el panel suba imágenes reales, esto se resuelve solo.
 *
 * `next/image` con `fill` hace que la imagen ocupe todo el contenedor, que
 * tiene que ser `relative` y tener alto. `sizes` le dice al navegador qué ancho
 * va a tener en cada breakpoint para que baje la versión justa.
 */
export function ProductImage({
  src,
  alt,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  priority = false,
}: {
  src?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain p-3"
      />
    );
  }

  const initials = alt
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface"
    >
      <span className="text-2xl font-bold tracking-wider text-brand/25">
        {initials || "W"}
      </span>
      <span className="text-[10px] font-semibold tracking-[0.2em] text-ink-soft/40">
        WIEDMER
      </span>
    </div>
  );
}
