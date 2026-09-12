import Link from "next/link";

import { sprayColors, wallColors, type PaintColor } from "@/data/paint-colors";
import { isLightColor } from "@/lib/color";
import type { Dictionary } from "@/lib/i18n";

/**
 * Cinta de colores de la home.
 *
 * Reemplaza al simulador de color, que ocupaba media pantalla y pedía que el
 * visitante hiciera algo (elegir un tono, cambiar de escena) justo en el lugar
 * donde lo que se busca es que siga bajando. Acá la carta se muestra sola: dos
 * filas de muestras que se deslizan en loop, una para cada lado.
 *
 * Es un Server Component a propósito: **no lleva `"use client"`**. Todo el
 * movimiento es CSS, así que no hace falta mandar ni una línea de JavaScript al
 * navegador para que la cinta ande. El único estado sería "¿está pausada?", y
 * de eso se encarga `:hover` en la hoja de estilos.
 */
export function ColorStrip({ t }: { t: Dictionary["colorStrip"] }) {
  return (
    <div className="space-y-3">
      <Fila colors={wallColors} label={t.wallLabel} seconds={48} />
      {/*
        La segunda fila va al revés. No es un capricho visual: con las dos
        filas yendo para el mismo lado el conjunto se lee como un solo bloque
        que se corrió, y el movimiento se vuelve invisible. En direcciones
        opuestas, cada fila hace de referencia fija de la otra.
      */}
      <Fila colors={sprayColors} label={t.sprayLabel} seconds={40} reverse />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm font-bold text-brand">
        <Link href="/categoria/pinturas" className="hover:underline">
          {t.ctaWall} →
        </Link>
        <Link href="/categoria/aerosoles" className="hover:underline">
          {t.ctaSpray} →
        </Link>
      </div>

      <p className="max-w-2xl pt-2 text-xs leading-relaxed text-ink-soft">
        {t.disclaimer}
      </p>
    </div>
  );
}

/**
 * Una fila de la cinta.
 *
 * @param seconds cuánto tarda en dar una vuelta entera. Las dos filas no tienen
 *   la misma cantidad de muestras, así que con la misma duración la más corta
 *   se vería más lenta. Se ajusta a mano para que las dos se muevan a un ritmo
 *   parecido (~4 s por muestra).
 */
function Fila({
  colors,
  label,
  seconds,
  reverse = false,
}: {
  colors: PaintColor[];
  label: string;
  seconds: number;
  reverse?: boolean;
}) {
  return (
    <section aria-label={label}>
      {/*
        `group` acá arriba es lo que permite pausar LAS DOS copias con el mouse
        en cualquier parte de la fila, y no solo la que está bajo el cursor.

        La máscara de los bordes hace que las muestras se desvanezcan al entrar
        y salir en vez de cortarse contra el borde de la pantalla. Sin ella, la
        cinta parece un contenedor con scroll; con ella, una cinta que sigue de
        largo.
      */}
      <div className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5rem,#000_calc(100%_-_5rem),transparent)]">
        {/*
          La lista va DOS veces. La segunda es un duplicado exacto y por eso
          lleva `aria-hidden`: un lector de pantalla leería los 12 colores dos
          veces seguidas sin que eso agregue nada.
        */}
        {[0, 1].map((copia) => (
          <ul
            key={copia}
            aria-hidden={copia === 1}
            style={{ animationDuration: `${seconds}s` }}
            className={[
              "flex shrink-0 gap-4 pr-4",
              "animate-marquee group-hover:[animation-play-state:paused]",
              reverse ? "[animation-direction:reverse]" : "",
            ].join(" ")}
          >
            {colors.map((color) => (
              <Muestra key={color.id} color={color} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

/** Una muestra: el color pleno con su nombre comercial encima. */
function Muestra({ color }: { color: PaintColor }) {
  return (
    <li className="shrink-0">
      <div
        /*
          El color va en `style` y no en una clase de Tailwind porque sale de un
          dato, no de la paleta del sitio: Tailwind genera sus clases leyendo el
          código fuente y no puede adivinar un hex que aparece recién en tiempo
          de ejecución.

          El `ring` interior es para que "Blanco Puro" no desaparezca contra el
          fondo claro de la sección.
        */
        style={{ backgroundColor: color.hex }}
        className="flex h-24 w-40 flex-col justify-end rounded-xl p-3 shadow-sm ring-1 ring-black/10 ring-inset sm:h-28 sm:w-44"
      >
        {/* Negro o blanco según la luminancia del color. La cuenta está en
            `isLightColor`, y no es el promedio de R, G y B: usa los
            coeficientes de la norma WCAG, porque el ojo ve el verde mucho más
            luminoso que el azul. */}
        <span
          className={[
            "text-xs font-bold tracking-tight",
            isLightColor(color.hex) ? "text-black/70" : "text-white/90",
          ].join(" ")}
        >
          {color.name}
        </span>
      </div>
    </li>
  );
}
