import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getT } from "@/lib/request-context";

export const metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Login único para los dos roles.
 *
 * El mismo formulario sirve para el cliente (que con esto destraba los
 * precios) y para el admin (que entra al panel). Quién es cada uno lo decide
 * `loginAction` comparando contra las dos credenciales configuradas, y de ahí
 * sale también a dónde se lo manda después.
 */
export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawNext = query.next;
  const next = (Array.isArray(rawNext) ? rawNext[0] : rawNext) ?? "";
  const t = await getT();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface p-4">
      {/* Un halo azul detrás de la tarjeta. `blur-3xl` sobre un círculo de
          color es la forma barata de hacer un degradado suave y orgánico. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          aria-label="Wiedmer"
          className="flex justify-center text-brand transition-opacity hover:opacity-80"
        >
          <WiedmerLogo size="lg" />
        </Link>

        <div className="animate-fade-up mt-8 rounded-2xl border border-line bg-card p-7 shadow-xl shadow-ink/5">
          <h1 className="text-lg font-bold tracking-tight">{t.login.title}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-soft">{t.login.subtitle}</p>

          <LoginForm next={next} t={t} />
        </div>

        <div className="animate-fade-up mt-5 rounded-xl border border-line bg-card/60 p-4 [animation-delay:120ms]">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {t.login.whyTitle}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            {t.login.whyText}
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-ink-soft">
          <Link href="/" className="underline transition hover:text-brand">
            {t.login.back}
          </Link>
        </p>
      </div>
    </div>
  );
}
