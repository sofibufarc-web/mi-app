import { CountUp } from "@/components/count-up";
import type { Dictionary } from "@/lib/i18n";

/**
 * Franja de cifras bajo el hero. Los números suben de 0 al entrar en pantalla.
 *
 * «Años de trayectoria» solo aparece si en `siteConfig.company.foundedYear`
 * está cargado el año de fundación: no se inventa un dato de la empresa.
 */
export function StatsStrip({
  t,
  products,
  zones,
  foundedYear,
  locale,
}: {
  t: Dictionary;
  products: number;
  zones: number;
  foundedYear: number | null;
  locale: string;
}) {
  const s = t.homeNew.stats;
  const items: { value: React.ReactNode; label: string }[] = [
    { value: <CountUp to={Math.floor(products / 100) * 100} prefix="+" locale={locale} />, label: s.products },
    { value: <CountUp to={zones} locale={locale} />, label: s.zones },
    { value: s.deliveryValue, label: s.delivery },
  ];
  if (foundedYear) {
    items.push({ value: <CountUp to={new Date().getFullYear() - foundedYear} locale={locale} />, label: s.years });
  }

  return (
    <section aria-label="Cifras" className="border-b border-line bg-surface">
      <dl className={`container-wiedmer grid gap-y-6 py-8 sm:py-10 ${items.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <dd className="order-1 font-display text-4xl font-extrabold tracking-tight text-brand sm:text-5xl">{it.value}</dd>
            <dt className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{it.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
