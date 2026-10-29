import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TabBar } from "@/components/client/tab-bar";
import { Skeleton, TypingIndicator } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { shortBRL, toProfile } from "@/lib/profile";
import { TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { NO_ASSISTANT_TEXT, startLeadConversation } from "@/lib/lead-service";
import { createClient } from "@/lib/supabase/server";
import { LeadChat } from "./lead-chat";

/** C-11 · Conversa com a imobiliária: assistente virtual (com selo), corretor e avisos do sistema. */
export default function LeadConversationPage({ params }: PageProps<"/app/corretor/[lead]">) {
  return (
    <>
      <Suspense fallback={<LeadSkeleton />}>
        <Conversation params={params} />
      </Suspense>
      <TabBar active="Corretor" />
    </>
  );
}

async function Conversation({ params }: Pick<PageProps<"/app/corretor/[lead]">, "params">) {
  const { lead: leadId } = await params;
  const { user } = await requireReadyClient(`/app/corretor/${leadId}`);
  const supabase = await createClient();
  const { data: conversations } = await supabase.rpc("my_conversations");
  const conv = (conversations ?? []).find((c) => c.lead_id === leadId);
  if (!conv) notFound();

  const loadMessages = () =>
    supabase
      .from("lead_messages")
      .select("id, sender, body, quick_replies, meta, created_at")
      .eq("lead_id", leadId)
      .order("id", { ascending: true })
      .limit(300);
  const [{ data: firstMessages }, { data: prop }, { data: profileRow }, settings] = await Promise.all([
    loadMessages(),
    conv.origin_property_id
      ? supabase
          .from("properties")
          .select("*, property_photos(storage_path, source_url, position, is_cover)")
          .eq("id", conv.origin_property_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
    loadScoringSettings(supabase),
  ]);

  // Conversa que ficou sem abertura (ex.: a assistente falhou no compartilhamento): abre agora.
  let messages = firstMessages;
  const opened = (messages ?? []).some((m) => m.sender === "assistente" || m.body === NO_ASSISTANT_TEXT);
  if (!opened && !conv.revoked) {
    await startLeadConversation(leadId);
    ({ data: messages } = await loadMessages());
  }

  const [{ data: visits }, { data: proposals }] = await Promise.all([
    supabase.from("visits").select("id, starts_at, status, property_id").eq("lead_id", leadId).order("starts_at"),
    supabase
      .from("proposals")
      .select("id, amount, status, counter_amount, created_at, forwarded_at, answered_at, client_accepted_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  // A próxima visita ativa (aguardando ou confirmada). O endereço aparece só depois de confirmada.
  const nextVisit = (visits ?? []).find((v) => v.status === "pedida" || v.status === "confirmada") ?? null;
  const { data: visitProp } = nextVisit?.property_id
    ? await supabase.from("properties").select("street, street_number, neighborhood").eq("id", nextVisit.property_id).maybeSingle()
    : { data: null };
  const lastProposal = proposals?.[0] ?? null;

  const score = prop ? scoreProperty(prop, toProfile(profileRow), settings.weights) : null;
  const cover = prop ? sortPhotos(prop.property_photos)[0] : null;

  return (
    <LeadChat
      leadId={leadId}
      agencyId={conv.agency_id}
      agencyName={conv.agency_name}
      brokerLine={conv.broker_name ? `Corretor(a) ${conv.broker_name}` : "Equipe da imobiliária"}
      assistantName={conv.assistant_name ?? "Assistente"}
      assistantActive={conv.assistant_active}
      revoked={conv.revoked}
      sharedAt={conv.shared_at}
      property={
        prop
          ? {
              id: prop.id,
              title: prop.title ?? TYPE_LABELS[prop.type],
              line: [prop.neighborhood, prop.price ? shortBRL(Number(prop.price)) : null].filter(Boolean).join(" · "),
              photoUrl: cover ? photoUrl(cover, publicEnv().NEXT_PUBLIC_SUPABASE_URL) : null,
              score: score?.score ?? null,
              price: prop.price === null ? null : Number(prop.price),
            }
          : null
      }
      visit={
        nextVisit
          ? {
              id: nextVisit.id,
              startsAt: nextVisit.starts_at,
              status: nextVisit.status,
              address: visitProp
                ? [[visitProp.street, visitProp.street_number].filter(Boolean).join(", "), visitProp.neighborhood].filter(Boolean).join(" · ") || null
                : null,
            }
          : null
      }
      takenSlots={(visits ?? []).filter((v) => v.status === "pedida" || v.status === "confirmada").map((v) => new Date(v.starts_at).toISOString())}
      proposal={
        lastProposal
          ? {
              id: lastProposal.id,
              amount: Number(lastProposal.amount),
              status: lastProposal.status,
              counterAmount: lastProposal.counter_amount === null ? null : Number(lastProposal.counter_amount),
              createdAt: lastProposal.created_at,
              forwardedAt: lastProposal.forwarded_at,
              answeredAt: lastProposal.answered_at,
              clientAcceptedAt: lastProposal.client_accepted_at,
            }
          : null
      }
      messages={(messages ?? []).map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        quickReplies: m.quick_replies,
        slots: slotsOf(m.meta),
        at: m.created_at,
      }))}
    />
  );
}

function LeadSkeleton() {
  return (
    <div className="grid gap-4 px-5 pt-14">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-[72px] rounded-[18px]" />
      <Skeleton className="h-24 w-3/4 rounded-[20px]" />
      <TypingIndicator />
    </div>
  );
}

/** Horários sugeridos pelo corretor (mensagem com meta "visit_slots"). */
function slotsOf(meta: unknown): string[] | null {
  const m = meta as { kind?: string; slots?: unknown } | null;
  if (m?.kind !== "visit_slots" || !Array.isArray(m.slots)) return null;
  return m.slots.filter((s): s is string => typeof s === "string").map((s) => new Date(s).toISOString());
}
