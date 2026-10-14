"use client";

import { useEffect, useState } from "react";

import { normalizeWhatsappNumber } from "@/lib/whatsapp";

const CLAVE = "wiedmer_fab_visto";

/** localStorage puede estar bloqueado (modo privado): nunca debe romper la página. */
function leerVisto(): boolean {
  try {
    return window.localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}
function guardarVisto() {
  try {
    window.localStorage.setItem(CLAVE, "1");
  } catch {
    /* sin almacenamiento: el aviso puede volver, no es grave */
  }
}

/**
 * Botón flotante de WhatsApp.
 *
 * Abajo a la derecha, en escritorio (en celular el WhatsApp ya está en la barra
 * inferior). Lo ve cualquiera, con o sin sesión: es el canal de contacto general.
 *
 * - Aparece recién después de bajar 400 px, para no competirle a los botones
 *   del inicio.
 * - **El pulso se ve solo la primera vez** (queda anotado en localStorage): un
 *   anillo que late para siempre termina siendo ruido.
 * - A los 6 segundos de aparecer sale una burbuja «¿Te ayudo con un pedido?»
 *   que se puede cerrar y no vuelve a salir.
 */
export function WhatsappFab({
  number,
  label,
  bubble,
  closeLabel,
}: {
  number: string;
  label: string;
  bubble: string;
  closeLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const [primeraVez, setPrimeraVez] = useState(false);
  const [burbuja, setBurbuja] = useState(false);
  const [descartada, setDescartada] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrimeraVez(!leerVisto());
    setDescartada(leerVisto());
  }, []);

  useEffect(() => {
    function alScrollear() {
      setVisible(window.scrollY > 400);
    }
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  // La burbuja sale unos segundos DESPUÉS de que el botón aparece.
  useEffect(() => {
    if (!visible || descartada) return;
    const id = window.setTimeout(() => setBurbuja(true), 6000);
    return () => window.clearTimeout(id);
  }, [visible, descartada]);

  function cerrarBurbuja() {
    setBurbuja(false);
    setDescartada(true);
    guardarVisto();
  }

  return (
    <div
      className={`fixed bottom-7 right-7 z-50 hidden items-end gap-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex ${
        visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      {burbuja && !descartada && (
        <div role="status" className="animate-fade-up relative mb-1 flex items-center gap-2 rounded-xl border border-line bg-card py-2 pl-4 pr-2 text-sm font-medium shadow-xl shadow-black/15">
          {bubble}
          <button
            type="button"
            onClick={cerrarBurbuja}
            aria-label={closeLabel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <span aria-hidden className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-r border-t border-line bg-card" />
        </div>
      )}

      <a
        href={`https://wa.me/${normalizeWhatsappNumber(number)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        tabIndex={visible ? 0 : -1}
        onClick={guardarVisto}
        className="group relative flex items-center overflow-hidden rounded-full bg-[#25D366] pl-3.5 pr-3.5 text-white shadow-xl shadow-black/25 transition-all duration-300 hover:gap-2 hover:pr-5 hover:brightness-105 focus-visible:gap-2 focus-visible:pr-5"
      >
        <span className="relative flex h-14 w-7 shrink-0 items-center justify-center">
          {visible && primeraVez && (
            <span aria-hidden className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-[#25D366] opacity-30 [animation-iteration-count:3]" />
          )}
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="relative h-7 w-7">
            <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.2-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
          </svg>
        </span>
        <span className="max-w-0 whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100 group-focus-visible:max-w-xs group-focus-visible:opacity-100">
          {label}
        </span>
      </a>
    </div>
  );
}
