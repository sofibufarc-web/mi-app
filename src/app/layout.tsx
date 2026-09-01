import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${libreFranklin.variable} h-full antialiased`}>
      {/* El carrito no necesita ningún provider acá: vive en un módulo
          (`src/lib/cart-store.ts`) al que cualquier componente cliente accede
          con el hook useCart(). */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
