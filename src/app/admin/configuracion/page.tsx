import { StoreConfigForm } from "@/components/store-config-form";
import { getStoreConfig } from "@/lib/data-source";

export const metadata = { title: "Configuración" };

export default async function AdminConfiguracionPage() {
  const config = await getStoreConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de la tienda</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Estos datos se usan en el header, el footer, la portada y el mensaje de
          WhatsApp del checkout.
        </p>
      </div>

      <StoreConfigForm config={config} />
    </div>
  );
}
