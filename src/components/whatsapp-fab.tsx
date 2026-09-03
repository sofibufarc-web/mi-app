"use client";

import { useEffect, useState } from "react";

import { normalizeWhatsappNumber } from "@/lib/whatsapp";

/**
 * Botón flotante de WhatsApp.
 *
 * Está fijo abajo a la derecha en todas las páginas de la tienda y abre el
 * chat con el número de la tienda. Es el canal de contacto de siempre, para
 * cualquiera: no depende de tener sesión iniciada.
 *
 * Dos decisiones:
 *
 * 1. **Aparece recién después de bajar un poco.** Arriba de todo el hero ya
 *    tiene sus propios botones; que además flote uno encima sería competirle a
 *    su propia llamada a la acción. Cuando el visitante ya scrolleó, en cambio,
 *    los botones del hero quedaron lejos y el flotante pasa a ser útil.
 * 2. **La etiqueta se despliega al pasar el mouse**, no está siempre abierta.
 *    Un cartel permanente tapa contenido en pantallas chicas; el círculo solo
 *    ocupa lo mínimo y el texto aparece cuando hace falta.
 *
 * El anillo que late está en `::before` con `animate-ping` de Tailwind, y se
 * frena solo con "reducir movimiento" (la regla global de `globals.css` anula
 * todas las animaciones infinitas).
 */
export function WhatsappFab({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function alScrollear() {
      setVisible(window.scrollY > 400);
    }

    alScrollear(); // por si la página cargó ya scrolleada (al volver con "atrás")
    // `passive: true` le promete al navegador que no vamos a cancelar el
    // scroll. Sin esa promesa tiene que esperar a que termine nuestro código
    // antes de mover la página, y el scroll se siente pesado.
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <a
      href={`https://wa.me/${normalizeWhatsappNumber(number)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      // Cuando está escondido no alcanza con la opacidad: `pointer-events-none`
      // y `aria-hidden` lo sacan también del alcance del mouse y del lector de
      // pantalla. Si no, sería un link invisible pero clickeable.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`group fixed bottom-5 right-5 z-50 flex items-center gap-0 overflow-hidden rounded-full bg-[#25D366] pl-3.5 pr-3.5 text-white shadow-xl shadow-black/25 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:gap-2 hover:pr-5 hover:brightness-105 focus-visible:gap-2 focus-visible:pr-5 sm:bottom-7 sm:right-7 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span className="relative flex h-14 w-7 shrink-0 items-center justify-center">
        {/* Anillo que late. `aria-hidden` porque es puro adorno. */}
        {visible && (
          <span
            aria-hidden
            className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-[#25D366] opacity-30"
          />
        )}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative h-7 w-7"
        >
          <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
        </svg>
      </span>

      {/*
        La etiqueta pasa de ancho 0 a su ancho natural al hacer hover.
        `max-w-0 → max-w-xs` es el truco para animar hasta "lo que mida el
        texto", que con `width: auto` no se puede animar.
      */}
      <span className="max-w-0 whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100 group-focus-visible:max-w-xs group-focus-visible:opacity-100">
        {label}
      </span>
    </a>
  );
}
