"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { saveStoreConfigAction, type FormState } from "@/app/admin/actions";
import type { StoreConfig } from "@/data/types";

/** Formulario de configuración general de la tienda. */

const inputClass =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-semibold text-ink-soft";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar configuración"}
    </button>
  );
}

export function StoreConfigForm({ config }: { config: StoreConfig }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(
    saveStoreConfigAction,
    { error: null },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Identidad</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Nombre de la tienda *</span>
            <input
              name="storeName"
              required
              defaultValue={config.storeName}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Texto del logo</span>
            <input
              name="logoText"
              defaultValue={config.logoText}
              className={inputClass}
            />
            <span className="text-[11px] text-ink-soft">
              El logo es texto, como en el sitio original. Se muestra en mayúsculas.
            </span>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelClass}>Logo como imagen (path, opcional)</span>
            <input
              name="logoImage"
              defaultValue={config.logoImage ?? ""}
              placeholder="/uploads/logo.png"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Pedidos por WhatsApp
        </h2>
        <div className="mt-4">
          <label className="flex max-w-sm flex-col gap-1">
            <span className={labelClass}>Número de destino *</span>
            <input
              name="whatsappNumber"
              required
              defaultValue={config.whatsappNumber}
              placeholder="5493416756969"
              className={inputClass}
            />
            <span className="text-[11px] text-ink-soft">
              Solo números, con código de país y el 9 de Argentina. Ejemplo:
              5493416756969 (= +54 9 341 675-6969).
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Textos de la portada
        </h2>
        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Título de bienvenida</span>
            <input
              name="welcomeTitle"
              defaultValue={config.welcomeTitle}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Texto de bienvenida</span>
            <textarea
              name="welcomeText"
              rows={3}
              defaultValue={config.welcomeText}
              className="w-full rounded-md border border-line bg-white p-3 text-sm leading-relaxed outline-none focus:border-brand"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Dirección</span>
            <input
              name="address"
              defaultValue={config.contact.address}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Teléfono</span>
            <input
              name="phone"
              defaultValue={config.contact.phone}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={config.contact.email}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Horario de atención</span>
            <input
              name="hours"
              defaultValue={config.contact.hours}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">Colores</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Se guardan acá como referencia de marca. Para que cambien visualmente
          hay que actualizarlos también en el bloque <code>@theme</code> de{" "}
          <code>src/app/globals.css</code>: Tailwind genera las clases en el
          build y no puede leerlos desde un JSON.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["brand", "Principal", config.colors.brand],
              ["brandDark", "Oscuro (hover)", config.colors.brandDark],
              ["brandDarker", "Más oscuro (footer)", config.colors.brandDarker],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="flex flex-col gap-1">
              <span className={labelClass}>{label}</span>
              <div className="flex gap-2">
                <input
                  name={name}
                  defaultValue={value}
                  className={inputClass}
                />
                <span
                  aria-hidden
                  className="h-11 w-11 shrink-0 rounded-md border border-line"
                  style={{ backgroundColor: value }}
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
