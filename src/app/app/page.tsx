import { Suspense } from "react";
import { TabBar } from "@/components/client/tab-bar";
import type { CardProperty } from "@/components/client/recommendation-card";
import { Skeleton, TypingIndicator } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import type { ChatCard } from "@/lib/chat-service";
import { publicEnv } from "@/lib/env";
import { CHIPS, STEPS, chipValue, filledChips, nextStep, toProfile } from "@/lib/profile";
import { TYPE_LABELS, photoUrl, sortPhotos } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";
import { ChatView, type ChatMessage } from "./chat-view";

/** C-04 · Conversa: monta o perfil e entrega as recomendações. */
export default function ConversationPage() {
  return (
    <>
      <Suspense fallback={<ChatSkeleton />}>
        <Conversation />
      </Suspense>
      <TabBar active="Conversa" />
    </>
  );
}

async function Conversation() {
  const { user, name } = await requireReadyClient("/app");
  const supabase = await createClient();
  const [{ data: row }, { data: rows }] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("profile_chat_messages")
      .select("id, author, body, quick_replies, cards")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(80),
  ]);
  const profile = toProfile(row);
  const history = (rows ?? []).reverse();

  // Imóveis dos cartões (podem ter saído do ar depois de recomendados).
  const ids = [...new Set(history.flatMap((m) => ((m.cards as ChatCard[] | null) ?? []).map((c) => c.property_id)))];
  const { data: props } = ids.length
    ? await supabase
        .from("properties")
        .select("id, title, type, neighborhood, bedrooms, area_m2, price, purpose, status, property_photos(storage_path, source_url, position, is_cover)")
        .in("id", ids)
    : { data: [] };
  const infos = await Promise.all(
    (props ?? [])
      .filter((p) => p.status === "publicado")
      .map(async (p) => {
        const { data } = await supabase.rpc("property_public_info", { p_id: p.id }).maybeSingle();
        return [p.id, data ? { name: data.agency_name, autonomous: data.agency_kind === "autonomo" } : null] as const;
      }),
  );
  const agencyNames = Object.fromEntries(infos);
  const base = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const properties: Record<string, CardProperty> = {};
  for (const p of props ?? []) {
    const cover = sortPhotos(p.property_photos)[0];
    properties[p.id] = {
      id: p.id,
      title: p.title ?? TYPE_LABELS[p.type],
      neighborhood: p.neighborhood,
      bedrooms: p.bedrooms,
      area_m2: p.area_m2,
      price: p.price,
      purpose: p.purpose,
      photoUrl: cover ? photoUrl(cover, base) : null,
      available: p.status === "publicado",
      agencyName: agencyNames[p.id]?.name ?? null,
      agencyAutonomous: agencyNames[p.id]?.autonomous ?? false,
    };
  }

  const messages: ChatMessage[] = history.map((m) => ({
    id: m.id,
    author: m.author,
    body: m.body,
    quickReplies: m.quick_replies,
    cards: ((m.cards as ChatCard[] | null) ?? [])
      .filter((c) => properties[c.property_id])
      .map((c) => ({ property: properties[c.property_id], score: c.score, reasons: c.reasons })),
  }));

  // Primeira visita: a primeira pergunta já está na tela (fluxo F1, passo 5), sem gravar nada.
  const step = nextStep(profile);
  const firstQuestion = STEPS[0];
  const intro = !messages.length
    ? { question: firstQuestion.question(profile), options: firstQuestion.options(profile).map((o) => o.label) }
    : null;

  return (
    <ChatView
      name={name ?? ""}
      chips={CHIPS.map((c) => ({ key: c.key, label: c.label, value: chipValue(c.key, profile) }))}
      filled={filledChips(profile)}
      messages={messages}
      intro={intro}
      pendingStep={step?.key ?? null}
      pendingOptions={step ? step.options(profile).map((o) => o.label) : []}
    />
  );
}

function ChatSkeleton() {
  return (
    <div className="grid gap-4 px-5 pt-14">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="mt-6 h-16 w-3/4 rounded-[20px]" />
      <TypingIndicator />
    </div>
  );
}
