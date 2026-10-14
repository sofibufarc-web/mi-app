import Link from "next/link";
import { notFound } from "next/navigation";

import { ParentSheetForm } from "@/components/parent-sheet-form";
import { getParentById, getProductsByIds } from "@/lib/data-source";

export const metadata = { title: "Editar ficha técnica" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminFichaPage({ params }: Props) {
  const { id } = await params;
  const parent = await getParentById(id);
  if (!parent) notFound();

  const comp = await getProductsByIds(parent.technical.complementarios ?? []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/fichas" className="text-xs text-ink-soft hover:text-brand">
          ← Fichas técnicas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{parent.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {parent.variants.length} variantes: {parent.variants.slice(0, 6).map((v) => v.sku).join(", ")}
          {parent.variants.length > 6 ? "…" : ""}
        </p>
      </div>
      <ParentSheetForm parent={parent} complementarios={comp.map((c) => c.sku)} />
    </div>
  );
}
