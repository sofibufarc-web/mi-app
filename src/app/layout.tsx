import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";

import { getLocale, getTheme } from "@/lib/request-context";

import "./globals.css";

/**
 * `next/font/google` descarga la fuente en el build y la sirve desde nuestro
 * dominio. Ventajas sobre el <link> a Google Fonts: no hay request a un tercero
 * y no hay "salto" de tipografía al cargar.
 *
 * `variable` la expone como custom property CSS, que globals.css usa en
 * `--font-sans` dentro del bloque @theme de Tailwind.
 */
const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wiedmer — Distribuidor mayorista de pinturería y ferretería",
    template: "%s | Wiedmer",
  },
  description:
    "Importador y distribuidor mayorista de artículos para pinturerías y ferreterías en Rosario. Pinturas, aerosoles, rodillos, lijas e impermeabilizantes.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  /*
   * Tema e idioma se resuelven EN EL SERVIDOR y se escriben en el <html>.
   *
   * Para el tema esto es lo que evita el "flash" blanco: si aplicáramos el
   * modo noche recién desde el JavaScript, el navegador alcanzaría a pintar
   * una pantalla clara antes. Acá el atributo ya viene en el HTML.
   *
   * `theme === null` significa que el usuario nunca eligió: no ponemos el
   * atributo y el CSS usa `prefers-color-scheme`, o sea lo que diga su sistema
   * operativo.
   */
  const [theme, locale] = await Promise.all([getTheme(), getLocale()]);

  return (
    <html
      lang={locale}
      // `data-theme` solo aparece si hubo una elección explícita.
      data-theme={theme ?? undefined}
      className={`${libreFranklin.variable} h-full antialiased`}
      /*
       * `scroll-behavior: smooth` está en globals.css para que los links
       * internos (#categorias) bajen suave. Este atributo le confirma a Next
       * que es intencional: sin él avisa por consola, porque el scroll suave
       * también afecta a los cambios de página y no siempre se quiere.
       */
      data-scroll-behavior="smooth"
      // suppressHydrationWarning: el botón de tema puede cambiar este atributo
      // en el navegador antes de que React termine de hidratar, y no queremos
      // que React avise de una diferencia que es justamente la que buscamos.
      suppressHydrationWarning
    >
      {/* El carrito no necesita ningún provider acá: vive en un módulo
          (`src/lib/cart-store.ts`) al que cualquier componente cliente accede
          con el hook useCart(). */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
