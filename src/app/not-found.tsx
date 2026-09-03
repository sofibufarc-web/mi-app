import Link from "next/link";

import { getT } from "@/lib/request-context";

/** Pantalla 404 global. La usa `notFound()` desde cualquier página. */
export default async function NotFound() {
  const t = await getT();

  return (
    <div className="container-wiedmer flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="animate-fade-up text-7xl font-bold tracking-tight text-brand/20">
        404
      </p>
      <h1 className="animate-fade-up mt-4 text-2xl font-bold tracking-tight [animation-delay:100ms]">
        {t.notFound.title}
      </h1>
      <p className="animate-fade-up mt-2 max-w-md text-sm text-ink-soft [animation-delay:180ms]">
        {t.notFound.text}
      </p>
      <Link
        href="/"
        className="animate-fade-up mt-7 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-dark [animation-delay:260ms]"
      >
        {t.notFound.button}
      </Link>
    </div>
  );
}
