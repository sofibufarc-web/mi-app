"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Uploader de imágenes del producto.
 *
 * Cómo funciona:
 *  1. El usuario elige archivos → se suben enseguida a /api/admin/upload.
 *  2. El endpoint valida tipo y tamaño y devuelve los paths públicos.
 *  3. Guardamos esos paths en el estado y los escribimos en un <input hidden>
 *     como JSON, que es lo que después lee la Server Action del formulario.
 *
 * La primera imagen de la lista es la principal. Se puede reordenar con las
 * flechas o marcar cualquiera como principal.
 */
export function ImageUploader({ initial }: { initial: string[] }) {
  const [images, setImages] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudieron subir las imágenes.");
        return;
      }
      setImages((current) => [...current, ...data.paths]);
    } catch {
      setError("Falló la conexión al subir las imágenes.");
    } finally {
      setUploading(false);
      // Limpiamos el input para poder volver a elegir el mismo archivo.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function makeMain(index: number) {
    setImages((current) => [
      current[index],
      ...current.filter((_, i) => i !== index),
    ]);
  }

  function remove(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Este input es el que lee la Server Action al guardar el producto. */}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md border border-line bg-card px-4 py-2 text-sm font-medium transition hover:bg-surface">
          {uploading ? "Subiendo…" : "Elegir imágenes"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
        <p className="text-xs text-ink-soft">
          JPG, PNG, WebP o AVIF. Hasta 5 MB cada una.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image}
              className={`overflow-hidden rounded-lg border bg-card ${
                index === 0 ? "border-brand ring-1 ring-brand" : "border-line"
              }`}
            >
              <div className="relative aspect-square bg-surface">
                <Image
                  src={image}
                  alt={`Imagen ${index + 1}`}
                  fill
                  sizes="160px"
                  className="object-contain p-2"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
                    Principal
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 border-t border-line p-1.5">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Mover a la izquierda"
                    className="h-7 w-7 rounded text-ink-soft transition hover:bg-surface disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Mover a la derecha"
                    className="h-7 w-7 rounded text-ink-soft transition hover:bg-surface disabled:opacity-30"
                  >
                    →
                  </button>
                </div>

                <div className="flex gap-0.5">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeMain(index)}
                      className="rounded px-1.5 py-1 text-[11px] font-medium text-brand transition hover:bg-brand-soft"
                    >
                      Principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Quitar imagen"
                    className="h-7 w-7 rounded text-ink-soft transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
