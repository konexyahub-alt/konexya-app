import Link from "next/link";
import { Suspense } from "react";
import { Icon, Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { ImportFlow } from "./import-flow";

/** P-08 · Importar imóveis por planilha. */
export default function ImportPage() {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Link href="/painel/imoveis" className="flex min-h-touch w-fit items-center gap-1.5 text-[13px] text-muted">
        <Icon name="back" size="sm" /> Imóveis anunciados
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight">Importar imóveis</h1>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Gate />
      </Suspense>
    </main>
  );
}

async function Gate() {
  await requireApprovedMember("/painel/imoveis/importar");
  return <ImportFlow />;
}
