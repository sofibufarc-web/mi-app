"use client";

import { useRef, type ReactNode } from "react";

/**
 * Inclinación 3D sutil siguiendo el mouse (máx. ~5°). Solo con mouse y sin
 * «reducir movimiento». Al salir vuelve suave a plano.
 */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = "transform 0.1s linear";
    el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
  }
  function soltar() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  }

  return (
    <div ref={ref} onPointerMove={mover} onPointerLeave={soltar} className={`h-full will-change-transform ${className}`}>
      {children}
    </div>
  );
}
