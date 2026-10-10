import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getT } from "@/lib/request-context";

export const metadata = { title: "Acceso administrador" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Login del ADMIN: email + contraseña propios, no la clave compartida de los
 * clientes. Una contraseña que conocen todos no puede abrir el panel.
 */
export default async function AdminLoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawNext = query.next;
  const next = (Array.isArray(rawNext) ? rawNext[0] : rawNext) ?? "";
  const t = await getT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          aria-label="Wiedmer"
          className="flex justify-center text-brand transition-opacity hover:opacity-80"
        >
          <WiedmerLogo size="lg" />
        </Link>

        <div className="animate-fade-up mt-8 rounded-2xl border border-line bg-card p-7 shadow-xl shadow-ink/5">
          <h1 className="text-lg font-bold tracking-tight">{t.login.adminTitle}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-soft">
            {t.login.adminSubtitle}
          </p>

          <LoginForm next={next} t={t} modo="admin" />
        </div>

        <p className="mt-5 text-center text-xs text-ink-soft">
          <Link href="/login" className="underline transition hover:text-brand">
            {t.login.clientLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
