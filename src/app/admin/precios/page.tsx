import { PriceListUploader } from "@/components/price-list-uploader";

export const metadata = { title: "Lista de precios" };

export default function AdminPreciosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lista de precios</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Actualizá los precios de todo el catálogo de una sola vez, a partir del
          archivo que manda el proveedor.
        </p>
      </div>

      <PriceListUploader />

      <section className="rounded-lg border border-line bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Cómo tiene que estar armado el archivo
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-md text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-semibold">Columna</th>
                <th className="py-2 pr-4 font-semibold">¿Obligatoria?</th>
                <th className="py-2 font-semibold">Para qué se usa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">codigo</td>
                <td className="py-2 pr-4 font-semibold text-brand">Sí</td>
                <td className="py-2 text-ink-soft">
                  Es el SKU. Con esto se busca cada producto en el sistema.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">precio</td>
                <td className="py-2 pr-4 font-semibold text-brand">Sí</td>
                <td className="py-2 text-ink-soft">
                  El precio nuevo. Acepta <code>89900</code>, <code>89.900,50</code>{" "}
                  y <code>$ 89.900</code>.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">nombre</td>
                <td className="py-2 pr-4 text-ink-soft">No</td>
                <td className="py-2 text-ink-soft">
                  Solo se usa si elegís crear los productos que no existen.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">categoria</td>
                <td className="py-2 pr-4 text-ink-soft">No</td>
                <td className="py-2 text-ink-soft">
                  Ídem: asigna categoría a los productos nuevos.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="mt-5 space-y-1.5 text-sm text-ink-soft">
          <li>
            · Los nombres de las columnas no distinguen mayúsculas, tildes ni
            espacios: <code>Código</code>, <code>CODIGO</code> y{" "}
            <code>cod. artículo</code> se entienden igual.
          </li>
          <li>
            · Si el archivo tiene filas de título arriba, se buscan los
            encabezados en las primeras 10 filas.
          </li>
          <li>
            · <strong>Los productos que no aparecen en el archivo no se tocan.</strong>{" "}
            Nunca se borra nada desde acá.
          </li>
          <li>· Formatos aceptados: .xlsx, .xls y .csv. Hasta 5 MB.</li>
        </ul>
      </section>
    </div>
  );
}
