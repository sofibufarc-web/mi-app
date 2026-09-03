"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { PricePreview } from "@/lib/price-types";
import { formatPrice } from "@/lib/format";

/**
 * Actualización masiva de precios, en tres pasos:
 *
 *   1. El usuario elige el archivo → se manda a /api/admin/precios/preview.
 *   2. Mostramos el informe: qué cambia, qué queda igual, qué es nuevo, qué
 *      falló. Nada se guardó todavía.
 *   3. El usuario confirma → /api/admin/precios/aplicar persiste los cambios.
 *
 * `createNew` decide si además se dan de alta los productos que el Excel trae
 * y el sistema no tiene. Se crean ocultos, para completarlos después.
 */

type Step = "upload" | "preview" | "done";

const cardClass = "rounded-lg border border-line bg-card p-5";

function SectionTitle({ children, count }: { children: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold">
      {children}
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft">
        {count}
      </span>
    </h3>
  );
}

export function PriceListUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [createNew, setCreateNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; created: number } | null>(
    null,
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/precios/preview", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No pudimos leer el archivo.");
        return;
      }

      setPreview(data as PricePreview);
      setStep("preview");
    } catch {
      setError("Falló la conexión al subir el archivo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleApply() {
    if (!preview) return;

    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/admin/precios/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: preview.toUpdate.map((row) => ({
            sku: row.sku,
            price: row.newPrice,
          })),
          newProducts: createNew
            ? preview.newItems.map((row) => ({
                sku: row.sku,
                name: row.name,
                price: row.price,
                categoryId: row.categoryId,
              }))
            : [],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No pudimos aplicar los cambios.");
        return;
      }

      setResult(data);
      setStep("done");
      router.refresh();
    } catch {
      setError("Falló la conexión al aplicar los cambios.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setCreateNew(false);
    setStep("upload");
  }

  /* ---------------------------------------------------------------- Paso 3 */
  if (step === "done" && result) {
    return (
      <div className={cardClass}>
        <h2 className="text-lg font-bold">Lista de precios actualizada</h2>
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">{result.updated}</strong> producto(s)
            con precio actualizado.
          </li>
          <li>
            <strong className="text-ink">{result.created}</strong> producto(s)
            creados
            {result.created > 0 && " (quedaron ocultos hasta que los completes)"}.
          </li>
        </ul>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
        >
          Subir otra lista
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- Paso 2 */
  if (step === "preview" && preview) {
    const nothingToDo =
      preview.toUpdate.length === 0 && (!createNew || preview.newItems.length === 0);

    return (
      <div className="space-y-5">
        <div className={cardClass}>
          <h2 className="text-lg font-bold">Previsualización</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Archivo <strong>{preview.fileName}</strong> · hoja “{preview.sheetName}”
            · encabezados en la fila {preview.headerRow} · {preview.dataRows} fila(s)
            de datos. <strong>Todavía no se guardó nada.</strong>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["A actualizar", preview.toUpdate.length, "text-brand"],
              ["Sin cambios", preview.unchanged.length, "text-ink-soft"],
              ["Nuevos", preview.newItems.length, "text-amber-600"],
              ["Con error", preview.errors.length, "text-red-600"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-md bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {preview.errors.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
            <SectionTitle count={preview.errors.length}>
              Filas que vamos a saltear
            </SectionTitle>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-sm text-red-800">
              {preview.errors.map((row, index) => (
                <li key={`${row.row}-${index}`}>
                  Fila {row.row}
                  {row.sku && ` (${row.sku})`}: {row.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview.toUpdate.length > 0 && (
          <div className={cardClass}>
            <SectionTitle count={preview.toUpdate.length}>
              Precios que van a cambiar
            </SectionTitle>
            <div className="mt-3 max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Código</th>
                    <th className="py-2 pr-3 font-semibold">Producto</th>
                    <th className="py-2 pr-3 text-right font-semibold">Actual</th>
                    <th className="py-2 pr-3 text-right font-semibold">Nuevo</th>
                    <th className="py-2 text-right font-semibold">Var.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.toUpdate.map((row) => (
                    <tr key={row.productId}>
                      <td className="py-2 pr-3 font-mono text-xs">{row.sku}</td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3 text-right text-ink-soft line-through">
                        {formatPrice(row.oldPrice)}
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-brand">
                        {formatPrice(row.newPrice)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          row.deltaPercent > 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {row.deltaPercent > 0 ? "+" : ""}
                        {row.deltaPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {preview.newItems.length > 0 && (
          <div className={cardClass}>
            <SectionTitle count={preview.newItems.length}>
              Códigos que no existen en el sistema
            </SectionTitle>

            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={createNew}
                onChange={(e) => setCreateNew(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#113bc2]"
              />
              <span>
                Crear estos productos.{" "}
                <span className="text-ink-soft">
                  Se dan de alta <strong>ocultos</strong>, sin descripción ni
                  imagen: después los completás desde Productos.
                </span>
              </span>
            </label>

            <div className="mt-3 max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-ink-soft">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Código</th>
                    <th className="py-2 pr-3 font-semibold">Nombre</th>
                    <th className="py-2 pr-3 font-semibold">Categoría</th>
                    <th className="py-2 text-right font-semibold">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.newItems.map((row) => (
                    <tr key={row.sku}>
                      <td className="py-2 pr-3 font-mono text-xs">{row.sku}</td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3 text-ink-soft">{row.categoryName}</td>
                      <td className="py-2 text-right font-semibold">
                        {formatPrice(row.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {preview.missingInFile.length > 0 && (
          <details className={cardClass}>
            <summary className="cursor-pointer text-sm font-bold">
              {preview.missingInFile.length} producto(s) del catálogo no figuran en
              el archivo · no se tocan
            </summary>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-sm text-ink-soft">
              {preview.missingInFile.map((row) => (
                <li key={row.sku}>
                  <span className="font-mono text-xs">{row.sku}</span> — {row.name} ·{" "}
                  {formatPrice(row.price)}
                </li>
              ))}
            </ul>
          </details>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || nothingToDo}
            className="h-11 rounded-md bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy
              ? "Aplicando…"
              : nothingToDo
                ? "No hay cambios para aplicar"
                : `Confirmar y actualizar ${preview.toUpdate.length} precio(s)`}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="h-11 rounded-md border border-line bg-card px-6 text-sm font-medium transition hover:bg-surface"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- Paso 1 */
  return (
    <div className={cardClass}>
      <h2 className="text-lg font-bold">Actualizar lista de precios</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Subí el archivo del proveedor. Vas a ver un resumen de los cambios antes
        de confirmar.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark">
          {busy ? "Leyendo archivo…" : "Elegir archivo .xlsx / .csv"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
        </label>

        <a
          href="/plantilla-precios.xlsx"
          download
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium transition hover:bg-surface"
        >
          Descargar plantilla
        </a>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
