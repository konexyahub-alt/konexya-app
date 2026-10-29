import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { parseQuestions } from "@/lib/assistant";
import { requireApprovedMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssistantEditor } from "./assistant-editor";

/** P-10 · Assistente virtual da imobiliária (docs/DECISOES.md). */
export default function AssistantPage() {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Suspense fallback={<Skeleton className="h-[520px] rounded-[20px]" />}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const { membership } = await requireApprovedMember("/painel/assistente");
  const supabase = await createClient();
  const { data } = await supabase.from("agency_assistant_settings").select("*").eq("agency_id", membership.agencyId).single();
  if (!data) return null;
  return (
    <AssistantEditor
      canEdit={membership.role === "gestor"}
      agencyName={membership.agencyName}
      autonomous={membership.autonomous}
      initial={{
        enabled: data.enabled,
        name: data.name,
        welcome_message: data.welcome_message,
        farewell_message: data.farewell_message,
        questions: parseQuestions(data.questions),
        distribution: data.distribution,
      }}
    />
  );
}
