/**
 * Logo de Wiedmer.
 *
 * ¿Por qué SVG y no el PNG original?
 * - El PNG viene con el fondo azul "quemado" adentro. Un SVG dibuja solo las
 *   formas: el fondo queda transparente y se apoya sobre lo que haya detrás.
 * - Escala sin pixelarse: el mismo archivo sirve para el header (24px) y para
 *   el hero (200px).
 * - Usa `currentColor`, que significa "el color de texto que herede". Así el
 *   logo se pone azul sobre fondo claro y blanco sobre fondo oscuro con solo
 *   cambiar la clase `text-…` del contenedor, sin duplicar archivos.
 * - Pesa ~1 KB contra los 22 KB del PNG.
 *
 * El isotipo es un recuadro redondeado con una W adentro, calcado del logo
 * real. Está dibujado como un polígono de 12 vértices: los trazos tienen
 * grosor horizontal constante, que es lo que le da los cortes rectos arriba y
 * abajo en vez de puntas en bisel.
 */

/** Coordenadas de la W dentro del viewBox de 120×104. */
const W_POINTS =
  "22.7,28 38,28 49.4,61.9 60,47.8 70.6,61.9 82,28 97.4,28 81.2,76 65.9,76 60,68.2 54.2,76 38.9,76";

/**
 * Solo el isotipo (el recuadro con la W). Sirve para favicon, para el hero y
 * para cualquier lugar donde el nombre ya esté escrito al lado.
 */
export function WiedmerMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 104"
      fill="none"
      role="img"
      aria-label="Wiedmer"
      className={className}
    >
      <rect
        x="11"
        y="11"
        width="98"
        height="82"
        rx="11"
        stroke="currentColor"
        strokeWidth="7"
      />
      <polygon points={W_POINTS} fill="currentColor" />
    </svg>
  );
}

/**
 * Logo completo: isotipo + la palabra WIEDMER.
 *
 * La palabra va como texto HTML y no como SVG a propósito: usa Libre Franklin,
 * la misma fuente que ya carga el sitio, así que se ve idéntica en todos lados
 * y además los lectores de pantalla y el buscador la leen como texto.
 *
 * `size` ajusta las dos partes juntas para que nunca se descalibren.
 */
export function WiedmerLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: { mark: "h-6", text: "text-base", gap: "gap-1.5" },
    md: { mark: "h-8", text: "text-xl sm:text-2xl", gap: "gap-2" },
    lg: { mark: "h-11", text: "text-3xl", gap: "gap-2.5" },
    xl: { mark: "h-16 sm:h-20", text: "text-4xl sm:text-6xl", gap: "gap-3 sm:gap-4" },
  }[size];

  return (
    <span className={`inline-flex items-center ${sizes.gap} ${className}`}>
      {/* aria-hidden porque el nombre ya está escrito al lado como texto:
          si no, un lector de pantalla diría "Wiedmer Wiedmer". */}
      <svg
        viewBox="0 0 120 104"
        fill="none"
        aria-hidden
        className={`${sizes.mark} w-auto`}
      >
        <rect
          x="11"
          y="11"
          width="98"
          height="82"
          rx="11"
          stroke="currentColor"
          strokeWidth="7"
        />
        <polygon points={W_POINTS} fill="currentColor" />
      </svg>
      <span
        className={`${sizes.text} font-extrabold leading-none tracking-[-0.01em]`}
      >
        WIEDMER
      </span>
    </span>
  );
}
