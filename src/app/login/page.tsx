import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getStoreConfig } from "@/lib/data-source";
import { getT } from "@/lib/request-context";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export const metadata = { title: "Ingresar", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Login de CLIENTES: una sola contraseña, sin usuario.
 *
 * Pantalla partida: a la izquierda una foto con una frase institucional (solo
 * en pantallas grandes); a la derecha el formulario sobre fondo blanco.
 * El admin entra por `/login/admin`, con email y contraseña.
 */
export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawNext = query.next;
  const next = (Array.isArray(rawNext) ? rawNext[0] : rawNext) ?? "";
  const [t, config] = await Promise.all([getT(), getStoreConfig()]);
  const whatsappUrl = `https://wa.me/${normalizeWhatsappNumber(config.whatsappNumber)}`;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand-darker text-white lg:block">
        <Image src="/img/hero.webp" alt="" fill priority sizes="50vw" className="animate-hero-zoom object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-brand-darker/55 to-brand-darker/25" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Wiedmer" className="text-white transition-opacity hover:opacity-80">
            <WiedmerLogo size="lg" />
          </Link>
          <p className="max-w-md font-display text-4xl font-extrabold leading-tight tracking-tight">{t.login.heroPhrase}</p>
        </div>
      </aside>

      <div className="flex flex-col items-center justify-center bg-card p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link href="/" aria-label="Wiedmer" className="mb-8 flex justify-center text-brand transition-opacity hover:opacity-80 lg:hidden">
            <WiedmerLogo size="lg" />
          </Link>

          <div className="animate-fade-up">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{t.login.title}</h1>
            <p className="mt-1 mb-7 text-sm text-ink-soft">{t.login.subtitle}</p>
            <LoginForm next={next} t={t} modo="cliente" />

            <p className="mt-5 text-center text-sm text-ink-soft">
              {t.login.noUser}{" "}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-2 hover:underline">
                {t.login.askSeller}
              </a>
            </p>
          </div>

          <div className="animate-fade-up mt-7 rounded-xl border border-line bg-surface p-4 [animation-delay:120ms]">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.login.whyTitle}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t.login.whyText}</p>
          </div>

          <p className="mt-5 text-center text-xs text-ink-soft">
            <Link href="/" className="underline transition hover:text-brand">
              {t.login.back}
            </Link>
            {" · "}
            <Link href="/login/admin" className="underline transition hover:text-brand">
              {t.login.adminLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
