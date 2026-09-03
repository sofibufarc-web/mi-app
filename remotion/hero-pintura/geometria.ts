/**
 * Geometría de la escena, medida sobre la foto original.
 *
 * Todo lo que dibujamos encima (el brillo que baja por el chorro, las ondas
 * del charco) tiene que caer EXACTAMENTE sobre la pintura de la foto. Para
 * eso trabajamos siempre en las coordenadas de la imagen original —1536×1024
 * píxeles— y dejamos que el SVG se encargue de escalarlas al tamaño del video.
 * Ese es el truco del `viewBox`: escribimos "x = 770" pensando en la foto y el
 * navegador lo traduce al video, mida lo que mida.
 *
 * Los números de `CHORRO` no están puestos a ojo: salieron de recorrer la foto
 * fila por fila buscando dónde empieza y dónde termina el azul brillante.
 */

/** Tamaño de la foto original, en píxeles. */
export const FOTO = { ancho: 1536, alto: 1024 } as const;

/**
 * Silueta del chorro: para cada altura `y`, en qué `x` empieza y termina.
 *
 * Arriba es ancho (la cortina de pintura que sale de la lata) y hacia abajo se
 * afina hasta quedar en unos 16 px: así cae un líquido espeso, se estira al
 * acelerar.
 */
export const CHORRO: readonly { y: number; izq: number; der: number }[] = [
  { y: 245, izq: 704, der: 986 },
  { y: 260, izq: 702, der: 971 },
  { y: 280, izq: 700, der: 931 },
  { y: 300, izq: 701, der: 904 },
  { y: 320, izq: 703, der: 879 },
  { y: 340, izq: 709, der: 856 },
  { y: 360, izq: 719, der: 828 },
  { y: 380, izq: 728, der: 813 },
  { y: 400, izq: 734, der: 810 },
  { y: 420, izq: 740, der: 812 },
  { y: 440, izq: 744, der: 813 },
  { y: 460, izq: 747, der: 812 },
  { y: 480, izq: 751, der: 813 },
  { y: 500, izq: 754, der: 814 },
  { y: 520, izq: 756, der: 813 },
  { y: 540, izq: 758, der: 811 },
  { y: 560, izq: 760, der: 806 },
  { y: 580, izq: 762, der: 800 },
  { y: 600, izq: 764, der: 797 },
  { y: 620, izq: 765, der: 796 },
  { y: 640, izq: 766, der: 795 },
  { y: 660, izq: 767, der: 795 },
  { y: 680, izq: 767, der: 794 },
  { y: 700, izq: 767, der: 793 },
  { y: 720, izq: 766, der: 792 },
  { y: 740, izq: 765, der: 791 },
  { y: 760, izq: 764, der: 792 },
  { y: 780, izq: 763, der: 794 },
  { y: 800, izq: 762, der: 796 },
];

/** Alturas donde nace y donde muere el chorro. */
export const CHORRO_Y0 = CHORRO[0].y;
export const CHORRO_Y1 = CHORRO[CHORRO.length - 1].y;

/**
 * Dónde cae el chorro en la bandeja: el centro de las ondas concéntricas.
 * Coincide con el punto de impacto que ya tiene la foto.
 */
export const IMPACTO = { x: 776, y: 800 } as const;

/**
 * Las ondas se ven en perspectiva: la bandeja está vista desde arriba y de
 * costado, así que un círculo en el líquido se proyecta como una elipse
 * aplastada. 0,34 es la relación alto/ancho que le corresponde a esta foto.
 */
export const APLASTADO = 0.34;

/**
 * Zona de pintura quieta donde pueden verse las ondas. Recortarlas contra este
 * polígono evita que se dibujen encima del rodillo o del borde de la bandeja,
 * que es lo que delataría el truco.
 */
export const CHARCO: readonly [number, number][] = [
  [430, 772],
  [560, 720],
  [760, 698],
  [930, 700],
  [968, 770],
  [975, 858],
  [880, 902],
  [650, 918],
  [470, 872],
];

/** Bordes izquierdo y derecho del chorro a la altura `y`, interpolados. */
export function bordesChorro(y: number): { izq: number; der: number } {
  if (y <= CHORRO[0].y) return CHORRO[0];
  const ultimo = CHORRO[CHORRO.length - 1];
  if (y >= ultimo.y) return ultimo;
  for (let i = 1; i < CHORRO.length; i++) {
    const b = CHORRO[i];
    if (y <= b.y) {
      const a = CHORRO[i - 1];
      const k = (y - a.y) / (b.y - a.y);
      return { izq: a.izq + (b.izq - a.izq) * k, der: a.der + (b.der - a.der) * k };
    }
  }
  return ultimo;
}

/** Eje del chorro a la altura `y`. Por ahí bajan los brillos. */
export const centroChorro = (y: number) => {
  const { izq, der } = bordesChorro(y);
  return (izq + der) / 2;
};

/** Ancho del chorro a la altura `y`. */
export const anchoChorro = (y: number) => {
  const { izq, der } = bordesChorro(y);
  return der - izq;
};

/**
 * Arma el contorno cerrado del chorro para usarlo como recorte (`clipPath`).
 * Bajamos por el borde izquierdo y volvemos subiendo por el derecho.
 */
export function siluetaChorro(): string {
  const bajada = CHORRO.map((p) => `${p.izq},${p.y}`).join(" L ");
  const subida = [...CHORRO].reverse().map((p) => `${p.der},${p.y}`).join(" L ");
  return `M ${bajada} L ${subida} Z`;
}

/** El polígono del charco, en formato de path. */
export function siluetaCharco(): string {
  return `M ${CHARCO.map(([x, y]) => `${x},${y}`).join(" L ")} Z`;
}
