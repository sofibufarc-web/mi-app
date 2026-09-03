"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo animado del hero: capas de pintura cayendo.
 *
 * Es lo más parecido a un video que conviene tener acá. En vez de un archivo
 * .mp4 (varios megas, borroso al estirarlo a pantalla completa, con el color
 * quemado adentro), la escena se dibuja cuadro a cuadro en un <canvas>: unos
 * KB de código, nítido en cualquier resolución y con los azules de la marca.
 *
 * Qué se ve, de arriba hacia abajo:
 *
 *   1. Un hilo de pintura que cae desde el borde superior, como vertido de
 *      una lata que quedó fuera de cuadro.
 *   2. CORTINAS: capas de pintura que cuelgan del techo, con el borde inferior
 *      ondulado y goterones que se alargan despacio y vuelven a empezar.
 *   3. CHARCOS: la pintura acumulada abajo, en capas de distinto tono, con la
 *      superficie moviéndose apenas.
 *
 * Todo el movimiento es lento y continuo. La sensación buscada es de empresa
 * seria y producto denso, no de página de ofertas: nada parpadea, nada rebota.
 *
 * Tres cuidados que hacen la diferencia:
 *
 * 1. `devicePixelRatio`: una pantalla Retina tiene 2 o 3 píxeles físicos por
 *    cada píxel CSS. Si el canvas no se agranda en esa proporción, el dibujo
 *    se ve borroso.
 * 2. `prefers-reduced-motion`: si el usuario pidió reducir el movimiento en su
 *    sistema, dibujamos UN cuadro fijo y no animamos nada. La imagen queda
 *    igual de linda y no marea a nadie.
 * 3. Pausas: si la pestaña deja de estar visible, cortamos la animación. No
 *    tiene sentido gastar batería dibujando algo que nadie está mirando.
 */

/**
 * Una capa de pintura. Las mismas propiedades sirven para las que cuelgan de
 * arriba y para las que se acumulan abajo; lo único que cambia es desde qué
 * borde se mide `size`.
 *
 * - `size`, `amp`: en FRACCIÓN de la altura del hero, no en píxeles, para que
 *   la escena se vea igual de proporcionada en un celular que en un monitor.
 * - `waves`: cuántas ondas completas entran a lo ancho. Números bajos = olas
 *   largas y calmas; altos = borde más picado.
 * - `speed`: velocidad del vaivén. En negativo, la onda viaja al otro lado;
 *   mezclar signos evita que todo se mueva en bloque, que es lo que delata
 *   una animación hecha a máquina.
 * - `drips`: posiciones horizontales (0 = izquierda, 1 = derecha) de los
 *   goterones que cuelgan de esa capa.
 */
type PaintLayer = {
  color: string;
  alpha: number;
  size: number;
  amp: number;
  waves: number;
  speed: number;
  phase: number;
  drips?: number[];
};

/** Capas que cuelgan del borde superior. Se dibujan de la más larga a la más corta. */
const CURTAINS: PaintLayer[] = [
  {
    color: "#1b4fd8",
    alpha: 0.5,
    size: 0.3,
    amp: 0.028,
    waves: 1.6,
    speed: 0.1,
    phase: 0,
    drips: [0.08, 0.29, 0.63, 0.87],
  },
  {
    color: "#2f6bff",
    alpha: 0.32,
    size: 0.19,
    amp: 0.022,
    waves: 2.4,
    speed: -0.14,
    phase: 2.1,
    drips: [0.19, 0.46, 0.76],
  },
];

/** Capas acumuladas en el piso. La primera es la más profunda y oscura. */
const POOLS: PaintLayer[] = [
  { color: "#0d2d94", alpha: 0.75, size: 0.22, amp: 0.02, waves: 1.3, speed: 0.09, phase: 1.4 },
  { color: "#113bc2", alpha: 0.5, size: 0.15, amp: 0.026, waves: 2.0, speed: -0.12, phase: 3.7 },
  { color: "#2f6bff", alpha: 0.28, size: 0.08, amp: 0.018, waves: 3.1, speed: 0.16, phase: 0.6 },
];

/** Dónde cae el chorro, en fracción del ancho. A la derecha, lejos del texto. */
const POUR_X = 0.8;

export function HeroCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Tamaño en píxeles CSS. Lo actualiza `resize()`. */
    let width = 0;
    let height = 0;
    let frameId = 0;

    function resize() {
      if (canvas === null || ctx === null) return;
      const rect = canvas.getBoundingClientRect();
      // Tope de 2: más allá de eso no se nota y sí se nota el costo.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      // Con esto podemos seguir dibujando en píxeles CSS y el navegador
      // se encarga de la escala.
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    /**
     * Altura del borde ondulado de una capa en la posición `x`, medida desde
     * su propio borde.
     *
     * El truco de las dos ondas: una sola onda seno se lee enseguida como
     * "esto es una fórmula". Sumando una segunda más corta, más rápida y en
     * sentido contrario, el borde nunca repite exactamente la misma forma y
     * el ojo lo lee como líquido.
     */
    function edgeOffset(layer: PaintLayer, x: number, t: number) {
      const k = (Math.PI * 2 * layer.waves) / Math.max(width, 1);
      const amp = height * layer.amp;
      return (
        Math.sin(x * k + t * layer.speed + layer.phase) * amp +
        Math.sin(x * k * 2.3 - t * layer.speed * 1.7 + layer.phase) * amp * 0.4
      );
    }

    /**
     * Un goterón: un hilo de pintura que baja y termina en una gota redonda.
     *
     * Rectángulo y círculo van en un ÚNICO path y un único `fill()`. Si fueran
     * dos rellenos separados, la zona donde se superponen se pintaría dos
     * veces y, al ser semitransparente, quedaría una banda más oscura a la
     * altura del cuello de la gota.
     */
    function drawDrip(x: number, top: number, len: number, w: number) {
      if (ctx === null || len <= 0) return;
      ctx.beginPath();
      ctx.rect(x - w / 2, top, w, len);
      // `moveTo` al punto exacto donde arranca el arco (ángulo 0), para que la
      // línea que canvas dibuja al conectar subpaths mida cero.
      ctx.moveTo(x + w / 2, top + len);
      ctx.arc(x, top + len, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    /**
     * Dibuja una capa completa.
     *
     * `from` dice de qué borde cuelga: "top" para las cortinas, "bottom" para
     * los charcos. Es el mismo dibujo espejado, así que una sola función
     * alcanza para los dos casos.
     */
    function drawLayer(layer: PaintLayer, t: number, from: "top" | "bottom") {
      if (ctx === null) return;

      const hanging = from === "top";
      const base = hanging ? height * layer.size : height * (1 - layer.size);
      // Respiración: la masa entera sube y baja unos pocos píxeles. Sin esto
      // solo se movería el borde y la capa parecería una calcomanía.
      const bob = Math.sin(t * 0.13 + layer.phase) * height * 0.012;
      const step = Math.max(6, width / 220);
      const edgeAt = (x: number) => base + bob + edgeOffset(layer, x, t);

      // El cuerpo: más claro contra el borde (pintura fresca, mojada) y más
      // apagado hacia adentro de la masa. Por eso el degradado arranca SIEMPRE
      // en el borde (`base`) y va hacia el borde de pantalla del que cuelga.
      const gradient = ctx.createLinearGradient(0, base, 0, hanging ? 0 : height);
      gradient.addColorStop(0, layer.color);
      gradient.addColorStop(1, "#0a2470");

      ctx.save();
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(0, hanging ? 0 : height);
      ctx.lineTo(width, hanging ? 0 : height);
      for (let x = width; x >= -step; x -= step) {
        ctx.lineTo(Math.max(x, 0), edgeAt(Math.max(x, 0)));
      }
      ctx.closePath();
      ctx.fill();

      // Filo brillante sobre el borde: es lo que hace que se lea como pintura
      // mojada y no como un recorte de papel.
      ctx.globalAlpha = layer.alpha * 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width + step; x += step) {
        const px = Math.min(x, width);
        const py = edgeAt(px);
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Goterones. Cada uno tiene su propio ciclo: crece, y sobre el final se
      // desvanece para poder volver a empezar sin que se note el corte.
      if (layer.drips !== undefined) {
        ctx.fillStyle = layer.color;
        layer.drips.forEach((dx, i) => {
          const x = width * dx;
          // `cycle` va de 0 a 1 y vuelve a 0. El desfasaje por índice evita
          // que todos los goterones caigan a la vez.
          const cycle = (t * 0.045 + i * 0.37 + layer.phase * 0.1) % 1;
          // Al cuadrado: arranca lento (la pintura junta cuerpo) y después se
          // descuelga. Es como cae una gota de verdad.
          const len = cycle * cycle * height * 0.42;
          const fade = cycle > 0.75 ? (1 - cycle) / 0.25 : 1;
          ctx.globalAlpha = layer.alpha * 0.9 * fade;
          drawDrip(x, edgeAt(x) - 2, len, Math.max(5, height * 0.011));
        });
      }

      ctx.restore();
    }

    /** El chorro que cae desde arriba y alimenta la escena. */
    function drawPour(t: number) {
      if (ctx === null) return;
      const cx = width * POUR_X;
      const bottom = height * 0.82;
      const step = Math.max(6, height / 90);

      ctx.save();
      ctx.globalAlpha = 0.5;
      const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
      gradient.addColorStop(0, "#5b8cff");
      gradient.addColorStop(0.6, "#2f6bff");
      gradient.addColorStop(1, "#2f6bff00");
      ctx.fillStyle = gradient;

      // El chorro se dibuja como un polígono: se baja por el lado derecho y se
      // vuelve por el izquierdo. `sway` lo hace ondear apenas, como un hilo de
      // pintura al que le pega el aire.
      const centerAt = (y: number) => cx + Math.sin(y * 0.006 + t * 0.35) * (width * 0.006);
      const halfAt = (y: number) => (height * 0.008 * (1 - (y / bottom) * 0.45)) / 2;

      ctx.beginPath();
      for (let y = 0; y <= bottom; y += step) {
        ctx.lineTo(centerAt(y) + halfAt(y), y);
      }
      for (let y = bottom; y >= 0; y -= step) {
        ctx.lineTo(centerAt(y) - halfAt(y), y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function render(t: number) {
      if (ctx === null) return;
      ctx.clearRect(0, 0, width, height);

      // Halo detrás del chorro: da profundidad y despega la escena del fondo
      // plano azul del hero.
      const glow = ctx.createRadialGradient(
        width * POUR_X,
        height * 0.7,
        0,
        width * POUR_X,
        height * 0.7,
        Math.max(width, height) * 0.55,
      );
      glow.addColorStop(0, "rgba(47,107,255,0.28)");
      glow.addColorStop(1, "rgba(47,107,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      drawPour(t);
      for (const layer of CURTAINS) drawLayer(layer, t, "top");
      for (const layer of POOLS) drawLayer(layer, t, "bottom");
    }

    function draw(time: number) {
      // `time` viene en milisegundos; pasarlo a segundos deja las velocidades
      // de arriba en números legibles.
      render(time / 1000);
      if (!reduceMotion) {
        frameId = requestAnimationFrame(draw);
      }
    }

    function start() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(draw);
    }

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        start();
      }
    }

    function handleResize() {
      resize();
      // Con el movimiento reducido no hay bucle: hay que repintar a mano.
      // El cuadro fijo no es el instante 0 (donde todo está alineado y se ve
      // artificial), sino uno con la escena ya "en marcha".
      if (reduceMotion) render(6);
    }

    resize();
    if (reduceMotion) {
      render(6);
    } else {
      start();
      document.addEventListener("visibilitychange", handleVisibility);
    }
    window.addEventListener("resize", handleResize);

    // La función que devuelve un useEffect es la "limpieza": React la llama
    // cuando el componente se va de pantalla. Sin esto el bucle seguiría
    // corriendo para siempre aunque el hero ya no exista.
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Es decoración pura: no aporta información, así que se lo escondemos a
      // los lectores de pantalla.
      aria-hidden
      className={className}
    />
  );
}
