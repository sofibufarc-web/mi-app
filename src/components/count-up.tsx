"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que sube de 0 al valor final cuando entra en pantalla.
 *
 * Con «reducir movimiento» muestra el número final de entrada. El texto final
 * ya está en el HTML del servidor (`aria-label`), así que un lector de pantalla
 * no lee los números intermedios.
 */
export function CountUp({
  to,
  prefix = "",
  duration = 1400,
  locale = "es-AR",
}: {
  to: number;
  prefix?: string;
  duration?: number;
  locale?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValor(to);
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const k = Math.min(1, (ahora - inicio) / duration);
          setValor(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} aria-label={`${prefix}${to.toLocaleString(locale)}`} className="tabular-nums">
      <span aria-hidden>
        {prefix}
        {valor.toLocaleString(locale)}
      </span>
    </span>
  );
}
