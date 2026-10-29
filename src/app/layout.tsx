import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Libre_Franklin } from "next/font/google";

import { siteConfig } from "@/config/site";
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

// Títulos (display) y códigos de producto (monoespaciada), ver globals.css.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Metadatos por defecto de TODO el sitio. Cada página puede pisar los suyos
 * (título, descripción, canonical) con su propio `metadata` o
 * `generateMetadata`; lo que no pise, lo hereda de acá.
 *
 * Qué hace cada bloque:
 *
 * - `metadataBase`: la URL absoluta del sitio. Next la usa para convertir las
 *   rutas relativas ("/opengraph-image") en direcciones completas. Sin esto,
 *   la imagen para WhatsApp saldría con una dirección que WhatsApp no puede
 *   abrir.
 * - `title`: la marca va PRIMERO. Cuando alguien busca "wiedmer", Google
 *   privilegia las páginas cuyo título arranca con ese nombre.
 * - `openGraph`: el "protocolo de tarjeta" que leen WhatsApp, Facebook,
 *   LinkedIn o Telegram para armar la vista previa del link (imagen, título y
 *   descripción). La imagen sale de `src/app/opengraph-image.tsx`.
 * - `robots`: permitir indexar. Las páginas privadas (login, carrito, panel)
 *   se excluyen aparte, en `robots.ts` y en su propio metadata.
 */
const TITULO = "Wiedmer | Mayorista de pinturería y ferretería en Rosario";
const DESCRIPCION =
  "Wiedmer, importador y distribuidor mayorista para pinturerías y ferreterías en Rosario: pinturas, aerosoles, rodillos, lijas e impermeabilizantes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: TITULO,
    template: "%s | Wiedmer",
  },
  description: DESCRIPCION,
  applicationName: "Wiedmer",
  keywords: [
    "Wiedmer",
    "Wiedmer mayorista",
    "distribuidor mayorista pinturería",
    "mayorista ferretería Rosario",
    "pinturas por mayor",
    "aerosoles",
    "rodillos",
    "Sinteplast",
  ],
  openGraph: {
    type: "website",
    siteName: "Wiedmer",
    locale: "es_AR",
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
      // Modo día por defecto: sin elección guardada, el sitio es claro aunque el
      // sistema esté en oscuro. El modo noche sigue disponible con el botón luna.
      data-theme={theme ?? "light"}
      className={`${libreFranklin.variable} ${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
