"use client";

import { useEffect, useRef, useState } from "react";

/**
 * «Cómo se compra»: tres pasos unidos por una línea que se completa con el
 * scroll, y al costado un mensaje de WhatsApp que se «escribe» solo.
 *
 * - La línea: se mide cuánto de la sección ya pasó por la pantalla y se escala
 *   en consecuencia. El scroll se escucha con `requestAnimationFrame` para no
 *   recalcular más de una vez por cuadro.
 * - El mensaje: arranca cuando el mockup entra en pantalla y va revelando
 *   letra por letra. Con «reducir movimiento» aparece completo de entrada.
 */
export function HowToBuy({
  steps,
  mock,
}: {
  steps: { title: string; text: string }[];
  mock: { title: string; from: string; lines: string[]; sent: string };
}) {
  const seccion = useRef<HTMLOListElement>(null);
  const [progreso, setProgreso] = useState(0);
  const mockRef = useRef<HTMLDivElement>(null);
  const textoCompleto = mock.lines.join("\n");
  const [escrito, setEscrito] = useState(0);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    let raf = 0;
    function calcular() {
      raf = 0;
      const el = seccion.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 cuando el tope de la lista toca el 80% de la pantalla; 1 cuando el
      // fondo llega al 60%.
      const k = (vh * 0.8 - r.top) / (r.height + vh * 0.2);
      setProgreso(Math.max(0, Math.min(1, k)));
    }
    function alScrollear() {
      if (!raf) raf = requestAnimationFrame(calcular);
    }
    calcular();
    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("resize", alScrollear);
    return () => {
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alScrollear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const el = mockRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEscrito(textoCompleto.length);
      setEnviado(true);
      return;
    }
    let intervalo = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        intervalo = window.setInterval(() => {
          setEscrito((n) => {
            if (n >= textoCompleto.length) {
              window.clearInterval(intervalo);
              setEnviado(true);
              return n;
            }
            return n + 1;
          });
        }, 28);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearInterval(intervalo);
    };
  }, [textoCompleto.length]);

  return (
    <div className="mt-12 grid items-start gap-12 lg:grid-cols-[1.2fr_0.8fr]">
      <ol ref={seccion} className="relative space-y-10 pl-16">
        {/* Línea de fondo y línea que se completa. */}
        <span aria-hidden className="absolute bottom-4 left-5 top-4 w-0.5 bg-line" />
        <span
          aria-hidden
          className="absolute left-5 top-4 w-0.5 origin-top bg-brand"
          style={{ height: "calc(100% - 2rem)", transform: `scaleY(${progreso})` }}
        />
        {steps.map((paso, i) => {
          const hecho = progreso >= (i + 0.25) / steps.length;
          return (
            <li key={paso.title} className="relative">
              <span
                aria-hidden
                className={`absolute -left-16 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-lg font-bold transition-colors duration-300 ${
                  hecho ? "border-brand bg-brand text-on-brand" : "border-line bg-card text-ink-soft"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight">{paso.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{paso.text}</p>
            </li>
          );
        })}
      </ol>

      {/* Mockup del mensaje de WhatsApp */}
      <div ref={mockRef} className="mx-auto w-full max-w-xs rounded-3xl border border-line bg-card p-3 shadow-xl shadow-black/10">
        <div className="rounded-2xl bg-[#ece5dd] p-3 dark:bg-[#0b141a]">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{mock.title}</p>
          <div className="min-h-44 whitespace-pre-line rounded-lg rounded-tr-none bg-[#d9fdd3] p-3 text-[13px] leading-relaxed text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
            <p className="mb-1 text-[11px] font-bold text-[#128C7E] dark:text-[#7be0c8]">{mock.from}</p>
            {textoCompleto.slice(0, escrito)}
            {escrito < textoCompleto.length && <span aria-hidden className="ml-px inline-block h-3.5 w-px animate-pulse bg-current align-middle" />}
          </div>
          <p className={`mt-1.5 text-right text-[11px] text-ink-soft transition-opacity duration-300 ${enviado ? "opacity-100" : "opacity-0"}`}>
            {mock.sent} ✓✓
          </p>
        </div>
      </div>
    </div>
  );
}
