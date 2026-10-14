"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Saludo al iniciar sesión. El login redirige con `?bienvenido=1`; acá se
 * muestra unos segundos y se limpia el parámetro de la barra de direcciones,
 * así recargar la página no lo repite.
 */
export function WelcomeToast({ message }: { message: string }) {
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (params.get("bienvenido") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("bienvenido");
    window.history.replaceState(null, "", url);
    const id = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(id);
  }, [params]);

  if (!visible) return null;
  return (
    <div role="status" className="animate-fade-up fixed inset-x-4 top-20 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm font-medium shadow-xl shadow-black/15">
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7" className="check-draw" />
        </svg>
      </span>
      {message}
    </div>
  );
}
