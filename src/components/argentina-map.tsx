"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mapa esquemático de Argentina con las provincias de cobertura.
 *
 * Es una silueta SIMPLIFICADA, dibujada a mano a partir de coordenadas
 * (longitud, latitud) y proyectada de forma plana: sirve para ubicar la zona de
 * reparto, no como cartografía. Las provincias se «pintan» una por una cuando
 * el mapa entra en pantalla.
 */

type Punto = [number, number]; // [longitud, latitud]

const PAIS: Punto[] = [
  [-66.2, -22.1], [-62.4, -22.0], [-60.0, -24.0], [-57.6, -25.3], [-55.7, -27.4], [-54.6, -25.6],
  [-53.7, -26.2], [-55.9, -28.4], [-57.6, -30.2], [-58.4, -33.0], [-58.4, -34.0], [-57.5, -34.5],
  [-57.0, -36.0], [-56.7, -37.0], [-57.7, -38.3], [-59.5, -38.8], [-62.1, -39.0], [-62.3, -40.6],
  [-64.9, -41.0], [-65.1, -43.3], [-65.3, -45.0], [-67.5, -46.0], [-65.9, -47.7], [-67.7, -49.0],
  [-69.0, -51.6], [-68.4, -52.4], [-69.3, -52.6], [-72.3, -50.5], [-71.9, -46.0], [-71.5, -43.0],
  [-71.7, -40.0], [-70.4, -36.0], [-70.1, -33.0], [-69.8, -30.0], [-68.5, -27.0], [-67.0, -24.0],
];

const PROVINCIAS: { nombre: string; puntos: Punto[] }[] = [
  {
    nombre: "Santa Fe",
    puntos: [[-62.0, -28.0], [-59.6, -28.2], [-59.9, -29.5], [-60.5, -31.0], [-60.6, -32.3], [-60.8, -33.3], [-60.2, -33.9], [-61.8, -34.3], [-62.5, -33.0], [-62.3, -30.0]],
  },
  {
    nombre: "Entre Ríos",
    puntos: [[-59.8, -30.2], [-58.2, -30.3], [-58.0, -32.0], [-58.4, -33.0], [-58.5, -33.8], [-59.2, -33.7], [-60.0, -33.0], [-60.5, -32.4], [-60.4, -31.2]],
  },
  {
    nombre: "Buenos Aires (norte)",
    puntos: [[-61.8, -34.3], [-60.2, -33.9], [-58.4, -34.0], [-57.5, -34.5], [-57.0, -36.0], [-56.7, -37.0], [-57.7, -38.3], [-59.5, -38.8], [-62.1, -39.0], [-62.4, -40.0], [-63.4, -39.6], [-63.4, -37.4], [-63.4, -35.6], [-62.4, -35.0]],
  },
  {
    nombre: "Córdoba",
    puntos: [[-65.0, -29.9], [-63.8, -29.5], [-62.2, -30.0], [-62.3, -32.0], [-61.9, -33.4], [-62.4, -35.0], [-63.9, -34.7], [-64.9, -34.2], [-65.0, -32.5], [-65.7, -31.0]],
  },
  {
    nombre: "La Pampa",
    puntos: [[-66.0, -35.0], [-64.0, -35.0], [-63.4, -35.6], [-63.4, -39.6], [-65.0, -39.0], [-67.5, -38.2], [-67.9, -36.2], [-67.0, -35.4]],
  },
];

// Proyección plana: x = longitud × cos(latitud media), y = −latitud.
const COS = Math.cos((37 * Math.PI) / 180);
const MIN_X = -73 * COS;
const MAX_Y = 53;
const ESCALA = 7;
const ancho = (-53 * COS - MIN_X) * ESCALA;
const alto = (MAX_Y - 22) * ESCALA;

function aPath(puntos: Punto[]): string {
  return (
    puntos
      .map(([lon, lat], i) => `${i === 0 ? "M" : "L"}${((lon * COS - MIN_X) * ESCALA).toFixed(1)} ${((-lat - 22 + 0) * ESCALA).toFixed(1)}`)
      .join(" ") + " Z"
  );
}

// Santa Fe: el punto donde queda Rosario.
const ROSARIO = { x: (-60.67 * COS - MIN_X) * ESCALA, y: (32.95 - 22) * ESCALA };

export function ArgentinaMap({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="mx-auto w-full max-w-[18rem]">
      <svg ref={ref} viewBox={`0 0 ${ancho.toFixed(0)} ${alto.toFixed(0)}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
        <path d={aPath(PAIS)} className="fill-surface stroke-line" strokeWidth="1.5" strokeLinejoin="round" />
        {PROVINCIAS.map((p, i) => (
          <path
            key={p.nombre}
            d={aPath(p.puntos)}
            strokeLinejoin="round"
            strokeWidth="1"
            className="fill-brand stroke-card"
            style={{
              opacity: visible ? 0.85 : 0,
              transform: visible ? "scale(1)" : "scale(0.96)",
              transformOrigin: "center",
              transformBox: "fill-box",
              transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
              transitionDelay: `${i * 250}ms`,
            }}
          >
            <title>{p.nombre}</title>
          </path>
        ))}
        <circle cx={ROSARIO.x} cy={ROSARIO.y} r="3.5" className="fill-accent stroke-card" strokeWidth="1.5" />
      </svg>
      <figcaption className="mt-2 text-center text-xs text-ink-soft">{label}</figcaption>
    </figure>
  );
}
