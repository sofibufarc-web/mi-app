"use client";

import { useState, type ReactNode } from "react";

/**
 * Plegable de filtros para el celular.
 *
 * En pantallas grandes (`lg`) los filtros son una columna lateral y esto no
 * hace nada: el panel siempre se ve y el botón no existe. En celular los
 * filtros ocupan varias pantallas y empujan los productos hacia abajo, así que
 * quedan detrás de un botón.
 *
 * Los filtros siguen siendo un <form> GET común, y este componente solo
 * muestra u oculta lo que le pasan adentro. Por eso es un Client Component
 * mínimo: el único estado es "¿está abierto?".
 */
export function FiltersToggle({
  label,
  activeCount,
  children,
}: {
  label: string;
  /** Cuántos filtros hay aplicados; se muestra al lado del botón. */
  activeCount: number;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-card px-4 text-sm font-semibold text-ink lg:hidden"
      >
        <span className="flex items-center gap-2">
          {label}
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-on-brand">{activeCount}</span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className={`${abierto ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}>{children}</div>
    </div>
  );
}
