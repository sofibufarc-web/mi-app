import Link from "next/link";

/** Pantalla 404 global. La usa `notFound()` desde cualquier página. */
export default function NotFound() {
  return (
    <div className="container-wiedmer flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold tracking-tight text-brand/20">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        Puede que el producto ya no esté en el catálogo o que la dirección esté
        mal escrita.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
