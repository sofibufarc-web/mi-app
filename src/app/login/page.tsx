import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { getStoreConfig } from "@/lib/data-source";

export const metadata = { title: "Ingresar al panel" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const rawNext = query.next;
  const next = (Array.isArray(rawNext) ? rawNext[0] : rawNext) ?? "/admin";
  const config = await getStoreConfig();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center">
          <span className="text-2xl font-bold tracking-[0.18em] text-brand">
            {config.logoText}
          </span>
        </Link>

        <div className="mt-6 rounded-lg border border-line bg-white p-6">
          <h1 className="text-lg font-bold tracking-tight">Panel de administración</h1>
          <p className="mt-1 mb-6 text-sm text-ink-soft">
            Ingresá con el usuario de la tienda.
          </p>

          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          <Link href="/" className="underline hover:text-brand">
            Volver al catálogo
          </Link>
        </p>
      </div>
    </div>
  );
}
