import Link from "next/link";

import { UpdatePasswordForm } from "@/components/update-password-form";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getT } from "@/lib/request-context";

/**
 * Donde aterriza el link de "restablecer contraseña" del mail.
 *
 * La página en sí no hace nada: todo el trabajo es del formulario, que es un
 * componente de cliente. El motivo es que Supabase manda el token de
 * recuperación en el **fragmento** de la URL, la parte después del `#`. Y el
 * fragmento no viaja al servidor: los navegadores nunca lo mandan. Solo el
 * JavaScript de la página puede leerlo.
 *
 * Es a propósito de Supabase, no un descuido: así el token no queda escrito en
 * los registros del servidor ni en el historial del proxy.
 */
export const dynamic = "force-dynamic";

export default async function ActualizarPasswordPage() {
  const t = await getT();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center text-brand"
          aria-label={t.login.back}
        >
          <WiedmerLogo />
        </Link>

        <div className="rounded-xl border border-line bg-card p-6 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight">Elegí una contraseña</h1>
          <p className="mt-1 mb-5 text-sm text-ink-soft">
            Es el último paso. Después vas a poder entrar con tu email y esta
            contraseña nueva.
          </p>

          <UpdatePasswordForm />
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-brand hover:underline">
            Volver al ingreso
          </Link>
        </p>
      </div>
    </main>
  );
}
