import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrandSplit } from "@/components/panel/brand-split";
import { Skeleton } from "@/components/ui";
import { getMembership, requireUser } from "@/lib/auth";
import { PartnerForm } from "./partner-form";

/** P-01 · Cadastro de parceiro. */
export default function PartnerPage() {
  return (
    <BrandSplit
      headline={
        <>
          Leads qualificados,
          <br />
          no mesmo sistema dos seus imóveis.
        </>
      }
      footnote="A Konexya confere cada cadastro antes de liberar o acesso."
    >
      <h1 className="text-[26px] font-bold tracking-tight">Quero ser parceiro</h1>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Form />
      </Suspense>
    </BrandSplit>
  );
}

async function Form() {
  const user = await requireUser("/painel/entrar", "/painel/parceiro");
  if (await getMembership(user)) redirect("/painel");
  return <PartnerForm email={user.email} />;
}
