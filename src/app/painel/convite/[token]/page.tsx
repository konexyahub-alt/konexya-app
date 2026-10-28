import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrandSplit } from "@/components/panel/brand-split";
import { Skeleton } from "@/components/ui";
import { getMembership, requireUser } from "@/lib/auth";
import { AcceptInviteForm } from "./accept-form";

/** Aceite de convite da equipe (link enviado pelo gestor). */
export default function InvitePage({ params }: PageProps<"/painel/convite/[token]">) {
  return (
    <BrandSplit headline="Bem-vindo à equipe." footnote="Painel para imobiliárias e corretores">
      <h1 className="text-[26px] font-bold tracking-tight">Aceitar convite</h1>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <Form params={params} />
      </Suspense>
    </BrandSplit>
  );
}

async function Form({ params }: Pick<PageProps<"/painel/convite/[token]">, "params">) {
  const { token } = await params;
  const user = await requireUser("/painel/entrar", `/painel/convite/${token}`);
  const membership = await getMembership(user);
  if (membership) redirect("/painel");
  return <AcceptInviteForm token={token} email={user.email} />;
}
