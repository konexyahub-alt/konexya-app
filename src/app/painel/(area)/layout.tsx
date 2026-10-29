import { Suspense } from "react";
import { PanelShell } from "@/components/panel/panel-shell";
import { Skeleton } from "@/components/ui";
import { requireDraftingMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { panelSignOut } from "../actions";

export default function PanelAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-10 h-40" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  // Cadastro pendente: só Imóveis (rascunhos); o resto abre depois da aprovação.
  const { membership, canPublish } = await requireDraftingMember("/painel");
  const gestor = membership.role === "gestor";
  // Visitas aguardando confirmação (o RLS limita: gestor, a imobiliária; corretor, as suas).
  const pendingVisits = canPublish ? await countPendingVisits(membership.agencyId) : 0;
  const items = !canPublish
    ? [{ href: "/painel/imoveis", label: "Meus imóveis", icon: "home" as const, primary: true }]
    : [
    { href: "/painel/inicio", label: "Painel", icon: "grid" as const, primary: true },
    { href: "/painel/funil", label: "Funil", icon: "kanban" as const },
    { href: "/painel/leads", label: "Leads", icon: "lead" as const, primary: true },
    { href: "/painel/agenda", label: "Agenda de visitas", short: "Agenda", icon: "cal" as const, primary: true, badge: pendingVisits },
    { href: "/painel/imoveis", label: "Meus imóveis", short: "Imóveis", icon: "home" as const, primary: true },
    // Corretor autônomo não tem equipe.
    ...(gestor && !membership.autonomous ? [{ href: "/painel/equipe", label: "Equipe", icon: "user" as const }] : []),
    ...(gestor ? [{ href: "/painel/assistente", label: "Assistente virtual", icon: "chat" as const }] : []),
  ];
  return (
    <PanelShell
      agencyName={membership.agencyName}
      roleLabel={membership.autonomous ? "Corretor(a) autônomo(a)" : membership.role === "gestor" ? "Gestor(a)" : "Corretor(a)"}
      items={items}
      signOut={panelSignOut}
    >
      {!canPublish ? <PendingNotice /> : null}
      {children}
    </PanelShell>
  );
}

async function countPendingVisits(agencyId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "pedida")
    .gte("starts_at", new Date().toISOString());
  return count ?? 0;
}

/** Cadastro em análise: o que já dá para fazer na área de rascunho e o que abre depois da aprovação. */
function PendingNotice() {
  return (
    <section
      aria-label="Cadastro em análise"
      className="mx-4 mt-4 grid gap-3 rounded-[20px] border border-warn/40 bg-warn-bg p-4 text-[13px] text-ink lg:mx-9 lg:mt-6"
    >
      <p>
        <b className="text-warn">Seu cadastro está sendo conferido pela Konexya.</b> Você recebe um e-mail quando for
        aprovado. Até lá, esta é a sua área de rascunho: nada aparece para os clientes.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-semibold">Você já pode:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Cadastrar imóveis um a um</li>
            <li>Importar seus imóveis por planilha</li>
            <li>Enviar fotos e completar a descrição</li>
            <li>Deixar os anúncios prontos para o selo Anúncio completo</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Depois da aprovação:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            <li>Publicar os imóveis para os clientes</li>
            <li>Receber leads e conversar com eles</li>
            <li>Configurar a assistente virtual</li>
            <li>Convidar a equipe (imobiliárias)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
