/**
 * Esqueleto mientras llega la categoría: el mismo molde que las tarjetas, en
 * gris pulsante. Next lo muestra solo, sin que la página tenga que pedirlo.
 */
export default function Loading() {
  return (
    <div className="container-wiedmer py-8" aria-busy="true">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden h-96 animate-pulse rounded-xl bg-surface lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-line bg-card">
              <div className="aspect-square animate-pulse bg-surface" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-surface" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
                <div className="h-5 w-1/3 animate-pulse rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
