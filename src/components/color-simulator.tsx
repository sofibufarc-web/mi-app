"use client";

import Link from "next/link";
import { useState } from "react";

import { sprayColors, wallColors, type PaintColor } from "@/data/paint-colors";
import { isLightColor } from "@/lib/color";
import type { Dictionary } from "@/lib/i18n";

/**
 * Simulador de color de la home.
 *
 * Qué es y qué NO es. No es realidad virtual ni realidad aumentada: no hay
 * cámara, no hay 3D y no hay anteojos. Es lo que en el rubro se llama
 * "simulador de color", que es lo que la gente realmente quiere cuando pide ver
 * cómo queda: elegís un tono y lo ves aplicado sobre algo reconocible.
 *
 * Por qué la escena está DIBUJADA y no es una foto. Con una foto habría que
 * recortar a mano qué píxeles son pared y cuáles no, y volver a hacerlo con
 * cada foto nueva. Acá cada superficie es un `<path>`, así que "pintar" es
 * cambiarle el `fill` a un elemento. Además pesa unos KB, se ve nítido en
 * cualquier pantalla y no hay que subir nada.
 *
 * El truco para que el color no se vea plano: el color va en una capa y las
 * SOMBRAS Y LUCES van en otra, encima, en escala de grises translúcida. Como el
 * degradado no tiene color propio, oscurece o aclara lo que tenga debajo sea
 * cual sea. Un solo juego de sombras sirve para los 22 colores.
 */

type Surface = "wall" | "spray";

/* ------------------------------------------------------------------ *
 * Escena 1: un ambiente. La superficie que se pinta es la pared.
 * ------------------------------------------------------------------ */

function RoomScene({ color, label }: { color: PaintColor; label: string }) {
  return (
    <svg
      viewBox="0 0 800 460"
      role="img"
      aria-label={`${label} ${color.name}`}
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        {/* La pared se oscurece hacia abajo: es donde llega menos luz. */}
        <linearGradient id="sim-wall-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.14" />
          <stop offset="45%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>

        {/* Y en las esquinas laterales, que es lo que da sensación de rincón. */}
        <linearGradient id="sim-wall-corners" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="35%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>

        {/* El charco de luz que entra por la ventana. */}
        <radialGradient id="sim-window-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="sim-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bcd8ec" />
          <stop offset="100%" stopColor="#e6eff5" />
        </linearGradient>

        <linearGradient id="sim-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9c7448" />
          <stop offset="100%" stopColor="#7b5a37" />
        </linearGradient>

        {/* La banda de luz de la pasada de rodillo. */}
        <linearGradient id="sim-roller" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* Recorta la pasada de rodillo para que no se salga de la pared. */}
        <clipPath id="sim-wall-clip">
          <rect x="0" y="0" width="800" height="368" />
        </clipPath>
      </defs>

      {/*
        LA PARED. Es la única forma que cambia de color.
        `transition` sobre `fill` hace que el cambio no sea un salto seco: el
        color viaja de uno a otro en medio segundo. En SVG el `fill` se anima
        igual que cualquier propiedad CSS.
      */}
      <rect
        x="0"
        y="0"
        width="800"
        height="368"
        fill={color.hex}
        style={{ transition: "fill 550ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />

      <g clipPath="url(#sim-wall-clip)">
        <rect x="0" y="0" width="800" height="368" fill="url(#sim-wall-shade)" />
        <rect x="0" y="0" width="800" height="368" fill="url(#sim-wall-corners)" />
        <ellipse cx="642" cy="200" rx="300" ry="230" fill="url(#sim-window-light)" />

        {/*
          La pasada de rodillo. `key` es lo que la hace volver a arrancar en
          cada color: React ve una key distinta, monta un elemento nuevo y la
          animación CSS empieza de cero.
        */}
        <g key={color.id} transform="skewX(-14)">
          <rect
            x="-180"
            y="-40"
            width="150"
            height="460"
            fill="url(#sim-roller)"
            className="animate-roller"
          />
        </g>
      </g>

      {/* Moldura del techo: una franja clara que le pone techo al color. */}
      <rect x="0" y="0" width="800" height="12" fill="#f3f1ec" />
      <rect x="0" y="12" width="800" height="3" fill="#000" opacity="0.07" />

      {/* ---------------- Ventana ---------------- */}
      <g>
        <rect x="548" y="62" width="196" height="226" rx="3" fill="#ffffff" />
        <rect x="558" y="72" width="176" height="206" fill="url(#sim-sky)" />
        {/* Los travesaños. Sin ellos parece un cuadro, no una ventana. */}
        <rect x="641" y="72" width="10" height="206" fill="#ffffff" />
        <rect x="558" y="170" width="176" height="10" fill="#ffffff" />
        {/* Alféizar, con su sombrita debajo. */}
        <rect x="538" y="288" width="216" height="12" rx="2" fill="#f7f6f2" />
        <rect x="538" y="300" width="216" height="6" fill="#000" opacity="0.12" />
      </g>

      {/* ---------------- Sofá ---------------- */}
      <g>
        <ellipse cx="196" cy="366" rx="160" ry="12" fill="#000" opacity="0.16" />
        <rect x="62" y="232" width="268" height="92" rx="14" fill="#cfc7ba" />
        <rect x="78" y="246" width="112" height="66" rx="10" fill="#ded7cb" />
        <rect x="202" y="246" width="112" height="66" rx="10" fill="#ded7cb" />
        <rect x="48" y="300" width="296" height="54" rx="16" fill="#e2dbcf" />
        <rect x="52" y="336" width="288" height="18" rx="9" fill="#000" opacity="0.08" />
        <rect x="72" y="352" width="16" height="18" rx="4" fill="#7b5a37" />
        <rect x="304" y="352" width="16" height="18" rx="4" fill="#7b5a37" />
      </g>

      {/* ---------------- Zócalo y piso ---------------- */}
      <rect x="0" y="368" width="800" height="18" fill="#f3f1ec" />
      <rect x="0" y="368" width="800" height="4" fill="#000" opacity="0.1" />
      <rect x="0" y="386" width="800" height="74" fill="url(#sim-floor)" />
      {/* Juntas de las tablas. */}
      <g fill="#000" opacity="0.13">
        <rect x="0" y="404" width="800" height="2" />
        <rect x="0" y="428" width="800" height="2" />
      </g>
      {/* El reflejo de la ventana sobre el piso, apenas insinuado. */}
      <path d="M566 386 h150 l58 74 h-186 Z" fill="#fff" opacity="0.13" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Escena 2: una reja. Es lo que de verdad se pinta con un aerosol.
 * ------------------------------------------------------------------ */

/**
 * Las barras de la reja se dibujan una sola vez, acá adentro, SIN color propio.
 * Después la escena las pinta tres veces con `<use>`: la sombra, el color y el
 * brillo. Si estuvieran escritas tres veces, cambiar una barra obligaría a
 * acordarse de cambiarla en los tres lados.
 */
function RailingShapes() {
  const bars = [];
  for (let i = 0; i < 11; i += 1) {
    const x = 138 + i * 52;
    bars.push(<rect key={i} x={x} y="104" width="11" height="262" />);
    // La punta de lanza arriba de cada barrote: es lo que la hace leer como
    // reja y no como una escalera.
    bars.push(<path key={`p${i}`} d={`M${x + 5.5} 76 l-9 26 h18 Z`} />);
  }

  return (
    <g>
      {/* Marco: dos parantes y tres travesaños. */}
      <rect x="108" y="88" width="16" height="290" />
      <rect x="676" y="88" width="16" height="290" />
      <rect x="108" y="98" width="584" height="14" />
      <rect x="108" y="236" width="584" height="12" />
      <rect x="108" y="358" width="584" height="16" />
      {bars}
    </g>
  );
}

function RailingScene({ color, label }: { color: PaintColor; label: string }) {
  return (
    <svg
      viewBox="0 0 800 460"
      role="img"
      aria-label={`${label} ${color.name}`}
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <RailingShapesDef />

        <linearGradient id="sim-back-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ddd7cd" />
          <stop offset="100%" stopColor="#c2bbb0" />
        </linearGradient>

        {/* Sombreado del metal: luz arriba, sombra abajo. */}
        <linearGradient id="sim-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="42%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>

        {/*
          La nube del aerosol. Los stops usan el color elegido, así que el
          degradado se rearma solo cuando cambia: de color pleno en el centro a
          transparente en el borde, que es como se deposita una pintura en
          spray.
        */}
        <radialGradient id="sim-mist" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={color.hex} stopOpacity="0.85" />
          <stop offset="55%" stopColor={color.hex} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color.hex} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fondo: pared del frente y vereda. */}
      <rect x="0" y="0" width="800" height="392" fill="url(#sim-back-wall)" />
      <rect x="0" y="392" width="800" height="68" fill="#9a958d" />
      <rect x="0" y="392" width="800" height="4" fill="#000" opacity="0.14" />
      {/* Juntas de la vereda, para que se lea como piso y no como una franja. */}
      <g fill="#000" opacity="0.1">
        <rect x="196" y="392" width="3" height="68" />
        <rect x="404" y="392" width="3" height="68" />
        <rect x="612" y="392" width="3" height="68" />
      </g>

      {/*
        La sombra de la reja proyectada en la pared. Son las mismas formas,
        corridas y en negro translúcido. Es lo que despega la reja del fondo:
        sin sombra se ve pegada como una calcomanía.
      */}
      <use href="#sim-railing" x="14" y="16" fill="#000" opacity="0.16" />

      {/* La reja pintada. Esta es la capa que cambia de color. */}
      <use
        href="#sim-railing"
        fill={color.hex}
        style={{ transition: "fill 550ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />

      {/* Y encima el sombreado del metal, que no tiene color propio. */}
      <use href="#sim-railing" fill="url(#sim-metal)" />

      {/* Contacto con el piso. */}
      <ellipse cx="400" cy="392" rx="300" ry="10" fill="#000" opacity="0.18" />

      {/* La nube de spray, que se rearma en cada color por la `key`. */}
      <circle
        key={color.id}
        cx="400"
        cy="232"
        r="210"
        fill="url(#sim-mist)"
        className="animate-spray"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </svg>
  );
}

/** Las formas de la reja, guardadas con un id para poder reusarlas. */
function RailingShapesDef() {
  return (
    <g id="sim-railing">
      <RailingShapes />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * El componente que arma todo.
 * ------------------------------------------------------------------ */

export function ColorSimulator({ t }: { t: Dictionary["simulator"] }) {
  const [surface, setSurface] = useState<Surface>("wall");

  /*
   * Un color guardado POR superficie, no uno solo compartido. Si fuera uno
   * solo, pasar de pared a reja y volver te devolvería con otro color del que
   * habías elegido, y se sentiría como que la app se olvidó de lo que hiciste.
   */
  const [wallColor, setWallColor] = useState<PaintColor>(wallColors[4]);
  const [sprayColor, setSprayColor] = useState<PaintColor>(sprayColors[4]);

  const isWall = surface === "wall";
  const palette = isWall ? wallColors : sprayColors;
  const color = isWall ? wallColor : sprayColor;
  const setColor = isWall ? setWallColor : setSprayColor;

  const tabs: { id: Surface; label: string }[] = [
    { id: "wall", label: t.wall },
    { id: "spray", label: t.spray },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------------- La escena ---------------- */}
        <div className="bg-surface p-3 sm:p-5">
          {/*
            Quién decide el tamaño de la escena es ESTE div, no el SVG.

            Safari tiene un bug viejo: a un <svg> en línea con `viewBox`,
            `width: 100%` y `height: auto` no le deduce la altura a partir de la
            proporción del viewBox, y lo colapsa a cero. Chrome y Firefox sí la
            deducen, así que el mismo código se ve bien en uno y en blanco en el
            otro. Se arregla dando vuelta la responsabilidad: el contenedor fija
            la caja con `aspect-[800/460]` —la misma proporción que el viewBox—
            y el SVG la rellena con `absolute inset-0 h-full w-full`. Sin
            depender de que el navegador deduzca nada.
          */}
          <div className="relative aspect-[800/460] w-full overflow-hidden rounded-xl">
            {isWall ? (
              <RoomScene color={color} label={t.sceneWall} />
            ) : (
              <RailingScene color={color} label={t.sceneSpray} />
            )}
          </div>
        </div>

        {/* ---------------- Los controles ---------------- */}
        <div className="flex flex-col gap-6 border-t border-line p-5 sm:p-6 lg:border-l lg:border-t-0">
          {/* Qué se pinta */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t.surfaceLabel}
            </p>
            <div className="mt-2 inline-flex rounded-lg border border-line p-1">
              {tabs.map((tab) => {
                const active = tab.id === surface;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSurface(tab.id)}
                    aria-pressed={active}
                    className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                      active
                        ? "bg-brand text-on-brand"
                        : "text-ink-soft hover:text-brand"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* La carta de colores */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t.paletteLabel}
            </p>

            <div className="mt-3 grid grid-cols-6 gap-2">
              {palette.map((option) => {
                const active = option.id === color.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-pressed={active}
                    // El nombre del color es la única etiqueta que tiene el
                    // botón: sin esto, un lector de pantalla lee "botón" doce
                    // veces seguidas.
                    aria-label={option.name}
                    title={option.name}
                    style={{ backgroundColor: option.hex }}
                    className={`aspect-square rounded-md border border-black/10 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      active ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : ""
                    }`}
                  >
                    {/* El tilde del color elegido. Va en negro sobre colores
                        claros y en blanco sobre oscuros: con un color fijo
                        desaparecería en media carta. */}
                    {active && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isLightColor(option.hex) ? "#191919" : "#ffffff"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto h-4 w-4"
                        aria-hidden
                      >
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Muestra grande del color elegido, con su nombre encima. */}
            <div
              style={{ backgroundColor: color.hex }}
              className="mt-4 flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 transition-colors duration-500"
            >
              <span
                className="text-sm font-bold"
                style={{ color: isLightColor(color.hex) ? "#191919" : "#ffffff" }}
              >
                {color.name}
              </span>
              <span
                className="font-mono text-xs uppercase opacity-70"
                style={{ color: isLightColor(color.hex) ? "#191919" : "#ffffff" }}
              >
                {color.hex}
              </span>
            </div>
          </div>

          <div className="mt-auto">
            <Link
              href={isWall ? "/categoria/pinturas" : "/categoria/aerosoles"}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
            >
              {isWall ? t.ctaWall : t.ctaSpray}
            </Link>

            {/* Aclaración honesta: una pantalla no reproduce un color real. */}
            <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-soft">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
