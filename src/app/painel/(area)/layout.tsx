import { Suspense } from "react";
import { PanelShell } from "@/components/panel/panel-shell";
import { Skeleton } from "@/components/ui";
import { requireDraftingMember } from "@/lib/auth";
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
  const items = !canPublish
    ? [{ href: "/painel/imoveis", label: "Imóveis anunciados", icon: "home" as const }]
    : [
    { href: "/painel/inicio", label: "Painel", icon: "grid" as const },
    { href: "/painel/funil", label: "Funil", icon: "kanban" as const },
    { href: "/painel/leads", label: "Leads", icon: "lead" as const },
    { href: "/painel/imoveis", label: "Imóveis anunciados", icon: "home" as const },
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
      {!canPublish ? (
        <p className="flex items-start gap-2 border-b border-paper-2 bg-warn-bg px-4 py-3 text-[13px] text-warn lg:px-9">
          Cadastro em análise. Você já pode cadastrar e importar imóveis como rascunho; publicar e receber leads fica
          liberado quando a Konexya aprovar.
        </p>
      ) : null}
      {children}
    </PanelShell>
  );
}
