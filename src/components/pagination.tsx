import Link from "next/link";

/**
 * Paginación por enlaces (?pagina=2).
 *
 * Son <a> comunes y no botones con JavaScript: cada página tiene su URL, se
 * puede compartir, el botón "atrás" anda y no hace falta código en el navegador.
 * Conserva los filtros (q, min, max, sort) al cambiar de página.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  params,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefDe = (n: number) => {
    const query = new URLSearchParams();
    for (const [clave, valor] of Object.entries(params)) {
      if (valor) query.set(clave, valor);
    }
    if (n > 1) query.set("pagina", String(n));
    const texto = query.toString();
    return texto ? `${basePath}?${texto}` : basePath;
  };

  // Muestra la primera, la última y las vecinas de la actual; el resto, "…".
  const numeros = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition";

  return (
    <nav aria-label="Paginación" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefDe(page - 1)} className={`${base} border-line hover:border-brand hover:text-brand`}>
          ← Anterior
        </Link>
      )}
      {numeros.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - numeros[i - 1] > 1 && <span className="px-1 text-ink-soft">…</span>}
          <Link
            href={hrefDe(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${base} ${
              n === page
                ? "border-brand bg-brand text-on-brand"
                : "border-line hover:border-brand hover:text-brand"
            }`}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefDe(page + 1)} className={`${base} border-line hover:border-brand hover:text-brand`}>
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
