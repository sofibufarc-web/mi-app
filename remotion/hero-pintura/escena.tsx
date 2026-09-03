import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  APLASTADO,
  CHORRO_Y0,
  CHORRO_Y1,
  FOTO,
  IMPACTO,
  bordesChorro,
  siluetaCharco,
  siluetaChorro,
} from "./geometria";

/**
 * Hero: la pintura cayendo de la lata a la bandeja.
 *
 * ── La idea ────────────────────────────────────────────────────────────────
 * Remotion no simula líquidos: dibuja cuadros de React y los junta en un
 * video. Así que la escena NO se recrea desde cero. La foto queda de fondo,
 * quieta —la cámara no se mueve, la luz no cambia— y encima le agregamos sólo
 * las tres cosas que en la realidad sí se moverían:
 *
 *   1. REFLEJOS que bajan por el chorro. Un chorro de pintura espesa tiene la
 *      silueta casi quieta: lo que delata que está cayendo son los brillos que
 *      se deslizan por su superficie. Bajan acelerando y estirándose, como se
 *      estira un líquido viscoso al caer.
 *   2. ONDAS concéntricas donde el chorro golpea el charco, que nacen chicas y
 *      se abren hacia afuera perdiendo fuerza.
 *   3. Un temblor casi imperceptible en la pintura acumulada.
 *
 * Todo lo demás —el rodillo, el pincel, el trapo, la lata— no se toca. Es lo
 * que pide la escena: plano fijo, todo quieto salvo la pintura.
 *
 * ── Por qué el video cierra con su propio principio ─────────────────────────
 * Un hero se reproduce en loop: cuando termina vuelve a empezar. Si en el
 * último cuadro las ondas quedaran a mitad de camino, el salto al primero se
 * vería como un corte. Para evitarlo, todo el movimiento se calcula a partir
 * de `t` (0 al empezar, 1 al terminar) y da un número ENTERO de vueltas. Así
 * el último cuadro empalma con el primero y el loop es invisible.
 *
 * ── Dónde tocar para ajustar ───────────────────────────────────────────────
 * Las constantes de acá abajo. Y para ver si los recortes siguen cayendo sobre
 * la pintura, está la composición `HeroPinturaGuias`, que dibuja en rojo las
 * siluetas medidas.
 */

/** Cuántos reflejos anchos bajan por el chorro a la vez. */
const REFLEJOS = 9;
/** Hilos finos y brillantes: son los que más "mojado" hacen ver al chorro. */
const HILOS = 5;
/** Sombras que bajan del lado oscuro y le dan volumen a la cinta. */
const SOMBRAS = 5;
/** Cuántas veces recorre el chorro cada reflejo en una vuelta del loop. */
const VUELTAS_BRILLO = 2;
/** Anillos de onda vivos al mismo tiempo en el charco. */
const ONDAS = 6;
/** Cuántas tandas de ondas salen en una vuelta del loop. */
const VUELTAS_ONDA = 3;
/** Hasta dónde se abre una onda antes de apagarse, en píxeles de la foto. */
const ALCANCE_ONDA = 205;

/**
 * Dónde cae el brillo dentro del ancho de la cinta: 0 = borde izquierdo,
 * 1 = borde derecho. La luz de la foto entra por la izquierda, así que el
 * reflejo va cerca de ese borde y la sombra, del otro lado.
 */
const LADO_LUZ = 0.3;
const LADO_SOMBRA = 0.74;

/**
 * Qué parte de la foto se ve cuando el video es más panorámico que ella.
 * 0 = pegado al borde de arriba, 1 = pegado al de abajo, 0,5 = centrado.
 */
const ENCUADRE_Y = 0.46;

/**
 * Devuelve un valor que va de 0 a 1 y vuelve a 0, `vueltas` veces por loop.
 * `desfase` corre el arranque, para que no salgan todos juntos.
 */
const ciclo = (t: number, vueltas: number, desfase: number) =>
  (((t * vueltas + desfase) % 1) + 1) % 1;

export type PropsHero = {
  /** Dibuja en rojo las siluetas medidas. Sólo sirve para ajustar la escena. */
  guias?: boolean;
};

export const HeroPintura: React.FC<PropsHero> = ({ guias = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // `t` avanza de 0 a 1 a lo largo de todo el video. Es el reloj de la escena.
  const t = frame / durationInFrames;

  // La foto se agranda lo justo para tapar el cuadro sin deformarse: es el
  // mismo criterio de `object-fit: cover` en CSS.
  const escala = Math.max(width / FOTO.ancho, height / FOTO.alto);
  const anchoFoto = FOTO.ancho * escala;
  const altoFoto = FOTO.alto * escala;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d" }}>
      <div
        style={{
          position: "absolute",
          left: (width - anchoFoto) / 2,
          top: (height - altoFoto) * ENCUADRE_Y,
          width: anchoFoto,
          height: altoFoto,
        }}
      >
        <Img
          src={staticFile("pintura-vertiendo.jpg")}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/*
          El SVG se apoya exactamente encima de la foto y usa su mismo sistema
          de coordenadas (`viewBox`), así lo que dibujemos en x=776 cae sobre
          el chorro aunque el video se renderice en 4K.
        */}
        <svg
          viewBox={`0 0 ${FOTO.ancho} ${FOTO.alto}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            {/* Recortes: nada de lo que dibujemos puede salirse de la pintura. */}
            <clipPath id="recorte-chorro">
              <path d={siluetaChorro()} />
            </clipPath>
            <clipPath id="recorte-charco">
              <path d={siluetaCharco()} />
            </clipPath>

            {/* Un reflejo no tiene borde: se desvanece. De ahí el degradado. */}
            <radialGradient id="brillo">
              <stop offset="0%" stopColor="#f2f7ff" stopOpacity="1" />
              <stop offset="45%" stopColor="#d5e5ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c3d9ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sombra">
              <stop offset="0%" stopColor="#03102b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#03102b" stopOpacity="0" />
            </radialGradient>

            <filter id="desenfoque-reflejo" x="-80%" y="-60%" width="260%" height="220%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="desenfoque-hilo" x="-150%" y="-60%" width="400%" height="220%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
            <filter id="desenfoque-onda" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
          </defs>

          {/* ── 1. Los reflejos que bajan por el chorro ─────────────────── */}
          <g clipPath="url(#recorte-chorro)">
            {/* Sombras primero: quedan debajo de los brillos. */}
            {Array.from({ length: SOMBRAS }, (_, i) => {
              const fase = ciclo(t, VUELTAS_BRILLO, i / SOMBRAS + 0.13);
              // Cae acelerando: al principio se demora, después se descuelga.
              const y = interpolate(fase, [0, 1], [CHORRO_Y0 - 60, CHORRO_Y1 + 40], {
                easing: Easing.poly(1.5),
              });
              const { izq, der } = bordesChorro(y);
              const anchoCinta = der - izq;
              const largo = interpolate(fase, [0, 1], [90, 240]);
              return (
                <ellipse
                  key={`s${i}`}
                  cx={izq + anchoCinta * LADO_SOMBRA}
                  cy={y}
                  rx={Math.min(Math.max(6, anchoCinta * 0.36), 70) / 2}
                  ry={largo / 2}
                  fill="url(#sombra)"
                  opacity={interpolate(fase, [0, 0.1, 0.85, 1], [0, 0.6, 0.45, 0])}
                  filter="url(#desenfoque-reflejo)"
                />
              );
            })}

            {Array.from({ length: REFLEJOS }, (_, i) => {
              const fase = ciclo(t, VUELTAS_BRILLO, i / REFLEJOS);
              const y = interpolate(fase, [0, 1], [CHORRO_Y0 - 70, CHORRO_Y1 + 30], {
                easing: Easing.poly(1.6),
              });
              const { izq, der } = bordesChorro(y);
              const anchoCinta = der - izq;
              // El reflejo se estira a medida que baja: así se ve un líquido
              // espeso, que no cae en gotas sino en una cinta que se alarga.
              const largo = interpolate(fase, [0, 1], [80, 280]);
              // Vaivén lento y chiquito: la cinta se retuerce apenas sobre su
              // eje. Es una función seno, así que arranca y termina igual.
              const meneo = Math.sin(2 * Math.PI * (t * 2 + i * 0.41)) * anchoCinta * 0.05;
              return (
                <ellipse
                  key={`r${i}`}
                  cx={izq + anchoCinta * LADO_LUZ + meneo}
                  cy={y}
                  rx={Math.min(Math.max(7, anchoCinta * 0.42), 64) / 2}
                  ry={largo / 2}
                  fill="url(#brillo)"
                  opacity={interpolate(fase, [0, 0.09, 0.78, 1], [0, 0.62, 0.5, 0])}
                  filter="url(#desenfoque-reflejo)"
                />
              );
            })}

            {/* Hilos: rayas finas y muy claras. Son el detalle que hace que la
                superficie se lea como mojada y en movimiento. */}
            {Array.from({ length: HILOS }, (_, i) => {
              const fase = ciclo(t, VUELTAS_BRILLO, i / HILOS + 0.07);
              const y = interpolate(fase, [0, 1], [CHORRO_Y0 - 50, CHORRO_Y1 + 20], {
                easing: Easing.poly(1.6),
              });
              const { izq, der } = bordesChorro(y);
              const anchoCinta = der - izq;
              // Cada hilo corre por una franja distinta de la cinta.
              const franja = 0.22 + ((i * 0.17) % 0.4);
              const meneo = Math.sin(2 * Math.PI * (t * 3 + i * 0.29)) * anchoCinta * 0.04;
              return (
                <ellipse
                  key={`h${i}`}
                  cx={izq + anchoCinta * franja + meneo}
                  cy={y}
                  rx={Math.min(Math.max(1.6, anchoCinta * 0.05), 7)}
                  ry={interpolate(fase, [0, 1], [50, 150])}
                  fill="#eef4ff"
                  opacity={interpolate(fase, [0, 0.12, 0.8, 1], [0, 0.5, 0.35, 0])}
                  filter="url(#desenfoque-hilo)"
                />
              );
            })}
          </g>

          {/* ── 2. Las ondas del charco ─────────────────────────────────── */}
          <g clipPath="url(#recorte-charco)">
            {Array.from({ length: ONDAS }, (_, i) => {
              const fase = ciclo(t, VUELTAS_ONDA, i / ONDAS);
              // Se abren rápido al principio y van frenando, como en el agua.
              const rx = interpolate(fase, [0, 1], [16, ALCANCE_ONDA], {
                easing: Easing.out(Easing.poly(1.8)),
              });
              const grosor = interpolate(fase, [0, 1], [7, 1.4]);
              const fuerza = interpolate(fase, [0, 0.08, 1], [0, 1, 0], {
                easing: Easing.out(Easing.quad),
              });
              return (
                <g key={`o${i}`} opacity={fuerza} filter="url(#desenfoque-onda)">
                  {/* La cara iluminada de la ola, arriba… */}
                  <ellipse
                    cx={IMPACTO.x}
                    cy={IMPACTO.y - grosor * 0.6}
                    rx={rx}
                    ry={rx * APLASTADO}
                    fill="none"
                    stroke="#9dbdf0"
                    strokeOpacity={0.5}
                    strokeWidth={grosor}
                  />
                  {/* …y el valle que queda en sombra, apenas más abajo. */}
                  <ellipse
                    cx={IMPACTO.x}
                    cy={IMPACTO.y + grosor * 0.7}
                    rx={rx}
                    ry={rx * APLASTADO}
                    fill="none"
                    stroke="#040f26"
                    strokeOpacity={0.4}
                    strokeWidth={grosor * 0.9}
                  />
                </g>
              );
            })}

            {/* Respiración lenta de la pintura acumulada: casi no se ve, pero
                sin ella el charco parece una foto pegada abajo. */}
            {[0, 1].map((i) => {
              const angulo = 2 * Math.PI * (t * (i === 0 ? 1 : 2) + i * 0.5);
              return (
                <ellipse
                  key={`c${i}`}
                  cx={IMPACTO.x - 130 + Math.sin(angulo) * 40 + i * 190}
                  cy={IMPACTO.y + 22 + Math.cos(angulo) * 6}
                  rx={150 + Math.cos(angulo) * 18}
                  ry={38}
                  fill="none"
                  stroke="#8fb2e8"
                  strokeOpacity={0.07}
                  strokeWidth={9}
                  filter="url(#desenfoque-onda)"
                />
              );
            })}
          </g>

          {/* ── 3. El punto de impacto ──────────────────────────────────── */}
          {/* Donde el chorro entra en el charco la pintura se abre y refleja
              más luz. Late muy despacio, al ritmo de las ondas que salen. */}
          <ellipse
            cx={IMPACTO.x}
            cy={IMPACTO.y - 4}
            rx={20 + Math.sin(2 * Math.PI * t * VUELTAS_ONDA) * 3}
            ry={9}
            fill="#cfe0ff"
            opacity={0.16 + Math.sin(2 * Math.PI * t * VUELTAS_ONDA) * 0.05}
            filter="url(#desenfoque-onda)"
          />

          {guias ? (
            <g fill="none" stroke="#ff2d55" strokeWidth={3}>
              <path d={siluetaChorro()} />
              <path d={siluetaCharco()} />
              <circle cx={IMPACTO.x} cy={IMPACTO.y} r={8} fill="#ff2d55" />
            </g>
          ) : null}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
