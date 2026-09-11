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

      {/* `currentUserId` no es seguridad: es para poder marcar "sos vos" y no
          ofrecer los botones que el servidor va a rechazar igual. */}
      <UserManager users={users} currentUserId={session?.userId ?? null} />
    </div>
  );
}
