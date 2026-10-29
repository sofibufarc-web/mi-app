import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * La imagen que aparece cuando alguien pega un link del sitio en WhatsApp,
 * Facebook, Telegram, LinkedIn, iMessage, etc.
 *
 * ## Cómo funciona
 *
 * Esas apps no abren la página como un navegador: mandan un "robot" que lee el
 * `<head>` buscando `<meta property="og:image">` (Open Graph, un estándar que
 * inventó Facebook y hoy usan todas). Next genera esa etiqueta solo, con solo
 * existir este archivo, y apunta a `/opengraph-image`. Esta función dibuja el PNG.
 *
 * ## Por qué se dibuja con código y no es un PNG suelto
 *
 * - El logo sale del mismo dibujo vectorial que usa el sitio, sin exportar nada
 *   a mano ni dejar un archivo que se desactualice.
 * - Se genera UNA vez, durante el build, y queda guardado como archivo estático.
 *
 * ## Medidas y peso
 *
 * 1200×630 es la proporción que usan todas las plataformas (1,91:1). WhatsApp
 * es la más exigente: si la imagen pesa mucho (más de unos 300 KB) a veces
 * directamente no muestra la vista previa. Con fondo liso y texto, esta pesa
 * una fracción de eso.
 *
 * ## La tipografía
 *
 * `ImageResponse` no tiene acceso a las fuentes de `next/font`, así que se
 * leen del disco. Son Libre Franklin (la del logo del sitio), licencia OFL, en
 * `src/assets/fonts/`. Formato WOFF porque es el que sabe leer el motor de
 * dibujo (Satori); WOFF2 no.
 */

export const alt = "Wiedmer — Distribuidor mayorista de pinturería y ferretería";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Los 12 vértices de la W. Los mismos de `src/components/wiedmer-logo.tsx`. */
const W_POINTS =
  "22.7,28 38,28 49.4,61.9 60,47.8 70.6,61.9 82,28 97.4,28 81.2,76 65.9,76 60,68.2 54.2,76 38.9,76";

/** Paleta del proyecto (CLAUDE.md, sección 2). */
const BRAND = "#1e3a8a";
const BRAND_DARKER = "#07184d";
const ACCENT = "#f97316";

export default async function Image() {
  const fuente = (peso: number) =>
    readFile(join(process.cwd(), "src/assets/fonts", `LibreFranklin-${peso}.woff`));
  const [extraBold, regular] = await Promise.all([fuente(800), fuente(400)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          color: "#ffffff",
          fontFamily: "Libre Franklin",
          backgroundImage: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARKER} 100%)`,
          position: "relative",
        }}
      >
        {/* Marca de agua: el isotipo gigante, cortado por el borde derecho. */}
        <svg
          width="720"
          height="624"
          viewBox="0 0 120 104"
          fill="none"
          style={{ position: "absolute", right: -150, bottom: -170, opacity: 0.07 }}
        >
          <rect x="11" y="11" width="98" height="82" rx="11" stroke="#ffffff" strokeWidth="7" />
          <polygon points={W_POINTS} fill="#ffffff" />
        </svg>

        {/* Logo: isotipo + palabra, igual que el del encabezado del sitio. */}
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <svg width="176" height="153" viewBox="0 0 120 104" fill="none">
            <rect x="11" y="11" width="98" height="82" rx="11" stroke="#ffffff" strokeWidth="7" />
            <polygon points={W_POINTS} fill="#ffffff" />
          </svg>
          <div
            style={{
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            WIEDMER
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Filete naranja: el único acento de la marca. */}
          <div style={{ width: 96, height: 8, backgroundColor: ACCENT, borderRadius: 4 }} />
          <div
            style={{
              marginTop: 28,
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            Distribuidor mayorista
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 40,
              fontWeight: 400,
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Pinturería y ferretería · Rosario, Santa Fe
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Libre Franklin", data: extraBold, weight: 800, style: "normal" },
        { name: "Libre Franklin", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
