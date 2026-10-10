import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { WiedmerLogo } from "@/components/wiedmer-logo";
import { getUserById } from "@/lib/data-source";
import { getSession, getT, getTheme } from "@/lib/request-context";

/**
 * Layout del panel.
 *
 * `src/proxy.ts` ya verificó la firma de la cookie antes de llegar acá. Pero la
 * cookie es una foto del momento del login: dice "u-001, admin" y sigue
 * diciéndolo durante siete días, aunque mientras tanto a ese usuario lo hayan
 * desactivado o bajado a cliente. El proxy no puede darse cuenta porque corre en
 * Edge y no puede consultar Postgres.
 *
 * Acá sí se puede, y acá es donde importa: se vuelve a preguntar a la base si
 * el usuario existe, sigue activo y sigue siendo admin. Es una consulta por
 * navegación del panel —que lo usa una persona cada tanto, no el público— a
 * cambio de que sacarle el acceso a alguien tenga efecto inmediato.
 *
 * `force-dynamic` por lo mismo que en la tienda: el panel siempre tiene que
 * mostrar el estado actual de los datos, nunca una versión cacheada.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  const usuario = session ? await getUserById(session.userId) : null;

  if (!usuario || !usuario.active || usuario.role !== "admin") {
    redirect("/login/admin?next=/admin");
  }

  const [t, theme] = await Promise.all([getT(), getTheme()]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-line bg-card">
        <div className="container-wiedmer flex h-16 items-center gap-4">
          <Link href="/admin" className="flex shrink-0 items-center text-brand">
            <WiedmerLogo size="sm" />
            <span className="ml-2 hidden text-xs font-semibold uppercase tracking-wide text-ink-soft sm:inline">
              {t.common.panel}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle t={t.theme} initial={theme} />

            <Link
              href="/"
              target="_blank"
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
            >
              Ver tienda ↗
            </Link>

            {/* Una Server Action se puede pasar directo como `action` de un
                <form>, sin necesidad de un componente cliente ni de un fetch. */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-line px-3 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
              >
                {t.common.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-wiedmer flex flex-1 flex-col gap-6 py-6 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
