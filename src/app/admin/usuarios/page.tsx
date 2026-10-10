import { ClientPasswordForm } from "@/components/client-password-form";
import { UserManager } from "@/components/user-manager";
import { listUsers } from "@/lib/data-source";
import { getSession } from "@/lib/request-context";

export const metadata = { title: "Usuarios" };

export default async function AdminUsuariosPage() {
  const [users, session] = await Promise.all([listUsers(), getSession()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Quién puede entrar. Un <strong>cliente</strong> ve los precios y arma
          pedidos; un <strong>admin</strong> además entra a este panel. Quien no
          tiene usuario ve el catálogo sin precios.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-base font-bold tracking-tight">
          Contraseña de acceso de clientes
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Es la única contraseña con la que entran los clientes (sin usuario).
          Al cambiarla, la anterior deja de funcionar y se cierran las sesiones
          abiertas: sirve para dejar afuera a quien ya no deba tenerla. Después
          hay que avisarles la nueva.
        </p>
        <ClientPasswordForm
          configured={Boolean(process.env.CLIENT_LOGIN_EMAIL?.trim())}
        />
      </section>

      {/* `currentUserId` no es seguridad: es para poder marcar "sos vos" y no
          ofrecer los botones que el servidor va a rechazar igual. */}
      <UserManager users={users} currentUserId={session?.userId ?? null} />
    </div>
  );
}
