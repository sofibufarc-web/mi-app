"use client";

import { useActionState, useState } from "react";

import { saveParentSheetAction, type FormState } from "@/app/admin/actions";
import type { ProductParent } from "@/data/types";

const inicial: FormState = { error: null };

type Doc = { label: string; url: string };

/**
 * Formulario de la carpeta técnica de un producto padre.
 *
 * Se carga UNA vez por padre y vale para todas sus variantes. Los datos y los
 * pasos se escriben como texto, una línea por ítem (más rápido que armar filas
 * una por una); los PDF se suben al bucket y quedan como enlaces.
 */
export function ParentSheetForm({
  parent,
  complementarios,
}: {
  parent: ProductParent;
  /** Códigos de los productos complementarios, ya resueltos desde sus ids. */
  complementarios: string[];
}) {
  const [state, action, pending] = useActionState(saveParentSheetAction, inicial);
  const [docs, setDocs] = useState<Doc[]>(parent.technical.documentos ?? []);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);

  const campo =
    "w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none transition focus:border-brand";

  async function subirPdf(indice: number, file: File) {
    setSubiendo(indice);
    setErrorSubida(null);
    const body = new FormData();
    body.append("files", file);
    body.append("tipo", "documento");
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json()) as { paths?: string[]; error?: string };
      if (!res.ok || !json.paths?.[0]) throw new Error(json.error ?? "No se pudo subir.");
      setDocs((d) => d.map((x, i) => (i === indice ? { ...x, url: json.paths![0] } : x)));
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setSubiendo(null);
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={parent.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold">Uso</span>
          <select name="usage" defaultValue={parent.usage ?? ""} className={campo}>
            <option value="">No aplica</option>
            <option value="interior">Interior</option>
            <option value="exterior">Exterior</option>
            <option value="ambos">Interior y exterior</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Terminación</span>
          <input name="finish" defaultValue={parent.finish ?? ""} placeholder="Mate, Satinado, Brillante…" className={campo} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Descripción</span>
        <textarea name="description" rows={4} defaultValue={parent.description} className={campo} />
        <span className="text-xs text-ink-soft">Separá los párrafos con una línea en blanco.</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Datos técnicos</span>
        <textarea
          name="datos"
          rows={6}
          defaultValue={(parent.technical.datos ?? []).map((d) => `${d.label}: ${d.value}`).join("\n")}
          placeholder={"Rendimiento: 10 a 12 m² por litro\nManos recomendadas: 2\nSecado al tacto: 2 horas"}
          className={`${campo} font-mono`}
        />
        <span className="text-xs text-ink-soft">Una línea por dato, con el formato «Etiqueta: valor».</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Modo de uso</span>
        <textarea
          name="uso_pasos"
          rows={6}
          defaultValue={(parent.technical.uso ?? []).join("\n")}
          placeholder={"Lijar y limpiar la superficie.\nAplicar una primera mano.\nLimpiar las herramientas con diluyente."}
          className={campo}
        />
        <span className="text-xs text-ink-soft">Un paso por línea; se muestran numerados.</span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Documentos (PDF)</legend>
        {docs.map((d, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[1fr_2fr_auto]">
            <input
              name={`doc_label_${i}`}
              value={d.label}
              onChange={(e) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
              placeholder="Ficha técnica"
              className={campo}
            />
            <input
              name={`doc_url_${i}`}
              value={d.url}
              onChange={(e) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)))}
              placeholder="https://… (o subí un PDF)"
              className={campo}
            />
            <div className="flex gap-2">
              <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
                {subiendo === i ? "Subiendo…" : "Subir PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && subirPdf(i, e.target.files[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => setDocs((x) => x.filter((_, j) => j !== i))}
                className="rounded-md border border-line px-3 text-xs text-ink-soft transition hover:border-red-500 hover:text-red-600"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDocs((x) => [...x, { label: "", url: "" }])}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Agregar documento
        </button>
        {errorSubida && <p className="text-sm text-red-600">{errorSubida}</p>}
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Productos complementarios (códigos)</span>
        <input
          name="complementarios"
          defaultValue={complementarios.join(", ")}
          placeholder="1577, 1540, 38433"
          className={`${campo} font-mono`}
        />
        <span className="text-xs text-ink-soft">
          Lo que se usa junto con este producto: diluyente, fondo, lija, rodillo… Separá los códigos con comas.
        </span>
      </label>

      {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn-primary h-11">
        {pending ? "Guardando…" : "Guardar ficha"}
      </button>
    </form>
  );
}
