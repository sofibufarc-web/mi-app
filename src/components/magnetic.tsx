"use client";

import { useRef, type ReactNode } from "react";

/**
 * Botón «magnético»: el contenido se corre unos píxeles hacia el cursor cuando
 * se acerca, y vuelve a su lugar al alejarse.
 *
 * El área sensible es un poco más grande que el botón (el padding negativo del
 * contenedor), así empieza a reaccionar ANTES de tocarlo. Solo con mouse: en
 * pantallas táctiles no hay cursor, y con «reducir movimiento» no se mueve.
 */
export function Magnetic({
  children,
  strength = 0.25,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const interior = useRef<HTMLDivElement>(null);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    const el = interior.current;
    if (el) {
      el.style.transition = "transform 0.12s linear";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }
  function soltar() {
    const el = interior.current;
    if (el) {
      el.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "translate(0, 0)";
    }
  }

  return (
    <div onPointerMove={mover} onPointerLeave={soltar} className={`-m-3 inline-block p-3 ${className}`}>
      <div ref={interior}>{children}</div>
    </div>
  );
}
