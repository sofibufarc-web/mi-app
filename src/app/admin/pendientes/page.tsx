import { PendingRow } from "@/components/pending-row";
import { getParentsForAdmin, getPendingProducts } from "@/lib/data-source";

export const metadata = { title: "Pendientes de asignar" };

export default async function AdminPendientesPage() {
  const [pendientes, padres] = await Promise.all([getPendingProducts(), getParentsForAdmin()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pendientes de asignar</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Códigos que llegaron en una lista de precios y todavía no pertenecen a ningún producto. Quedan ocultos en el
          catálogo hasta que los asignes: elegí el producto al que pertenecen (con su color y tamaño) o creá uno nuevo.
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
          No hay códigos pendientes. 🎉
        </p>
      ) : (
        <ul className="space-y-3">
          {pendientes.map((p) => (
            <PendingRow
              key={p.id}
              product={{ id: p.id, sku: p.sku, name: p.name, price: p.price }}
              parents={padres.map((x) => ({ id: x.id, name: x.name }))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
