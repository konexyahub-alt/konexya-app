import "server-only";
import { AiError, generateStructured, isAiConfigured } from "@/lib/ai/client";
import { aiMessagesToday, dailyLimit, logAiAction } from "@/lib/ai/log";
import { chatOutputSchema, chatSystemPrompt, fixPra, sanitizeChatUpdates } from "@/lib/ai/prompts";
import { serverEnv } from "@/lib/env";
import { parseStepAnswer } from "@/lib/parse-answer";
import {
  applyUpdate,
  diffProfile,
  isMinimumProfile,
  nextStep,
  toProfile,
  type Profile,
  type ProfileUpdate,
} from "@/lib/profile";
import { RECOMMENDATION_COLUMNS, loadScoringSettings, type RecommendationProperty } from "@/lib/recommendations";
import { rankProperties } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Conversa de perfil (C-04, fluxo F2). Cada resposta atualiza o perfil no banco; respostas rápidas e
 * respostas que dá para entender sem IA não gastam IA. Quando o perfil mínimo fica completo, a conversa
 * mostra os 3 imóveis mais compatíveis (nota calculada pelo código, nunca pela IA).
 */
export const CHAT_ERROR_TEXT = "Não consegui responder agora. Tente de novo.";
export const CHAT_LIMIT_TEXT =
  "Você usou as mensagens de hoje. Amanhã a conversa continua. As respostas rápidas seguem funcionando.";

export type ChatCard = { property_id: string; score: number; reasons: { band: string; text: string }[] };

type Outgoing = { author: "ia" | "sistema"; body: string; quick_replies?: string[]; cards?: ChatCard[] };

export async function processChatMessage(userId: string, text: string, opts: { retry?: boolean } = {}) {
  const supabase = await createClient();
  const body = text.trim().slice(0, 1500);
  if (!body) return;

  const { data: row } = await supabase.from("client_profiles").select("*").eq("user_id", userId).single();
  const before = toProfile(row);
  if (!opts.retry) {
    await supabase.from("profile_chat_messages").insert({ user_id: userId, author: "cliente", body });
  }

  const step = nextStep(before);
  const out: Outgoing[] = [];
  let update: ProfileUpdate | null = null;

  // 1) Resposta rápida tocada ou texto que dá para entender sem IA.
  if (step) {
    const option = step.options(before).find((o) => o.label.toLowerCase() === body.toLowerCase());
    update = option?.update ?? parseStepAnswer(step.key, body);
  }

  // 2) Fora do roteiro (ou depois dele): a IA interpreta.
  if (!update) {
    const ai = await interpretWithAi(userId, before, step?.question(before) ?? null, body);
    if (ai.kind === "ok") {
      update = ai.update;
      out.push({ author: "ia", body: ai.reply });
    } else if (ai.kind === "limite") {
      out.push({ author: "sistema", body: CHAT_LIMIT_TEXT });
    } else if (ai.kind === "sem_ia") {
      out.push({ author: "ia", body: "Não entendi. Toque numa das opções ou escreva de outro jeito." });
    } else {
      out.push({ author: "sistema", body: CHAT_ERROR_TEXT });
      await insertMessages(userId, out);
      return;
    }
  }

  let after = before;
  if (update && Object.keys(update).length) {
    after = applyUpdate(before, update);
    const diff = diffProfile(before, after);
    if (Object.keys(diff).length) {
      const { error } = await supabase.from("client_profiles").update(diff).eq("user_id", userId);
      if (error) {
        console.error("client_profiles", error.message);
        await insertMessages(userId, [{ author: "sistema", body: CHAT_ERROR_TEXT }]);
        return;
      }
    }
  }

  const changed = JSON.stringify(before) !== JSON.stringify(after);
  const next = nextStep(after);
  if (next) {
    out.push({ author: "ia", body: next.question(after), quick_replies: next.options(after).map((o) => o.label) });
  } else if (isMinimumProfile(after) && (changed || !(await lastCards(userId)))) {
    out.push(...(await recommendationMessages(userId, after)));
  } else if (!isMinimumProfile(after) && !out.length) {
    out.push({ author: "ia", body: "Para recomendar, me conte em que bairros você procura." });
  }
  await insertMessages(userId, out);
}

async function insertMessages(userId: string, list: Outgoing[]) {
  if (!list.length) return;
  const supabase = await createClient();
  const { error } = await supabase.from("profile_chat_messages").insert(
    list.map((m) => ({
      user_id: userId,
      author: m.author,
      body: fixPra(m.body),
      quick_replies: m.quick_replies ?? [],
      cards: (m.cards ?? null) as Json,
    })),
  );
  if (error) console.error("profile_chat_messages", error.message);
}

async function lastCards(userId: string): Promise<string[] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_chat_messages")
    .select("cards")
    .eq("user_id", userId)
    .not("cards", "is", null)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cards = data?.cards as ChatCard[] | null | undefined;
  return cards ? cards.map((c) => c.property_id) : null;
}

/** Top 3 com nota e motivos, ou o aviso honesto de que ainda não há imóvel compatível publicado. */
async function recommendationMessages(userId: string, profile: Profile): Promise<Outgoing[]> {
  const supabase = await createClient();
  const [{ data: props }, settings, previous] = await Promise.all([
    supabase.from("properties").select(RECOMMENDATION_COLUMNS).eq("status", "publicado"),
    loadScoringSettings(supabase),
    lastCards(userId),
  ]);
  const ranked = rankProperties((props ?? []) as RecommendationProperty[], profile, settings.weights, settings.sealBonus);
  const top = ranked.slice(0, 3);
  if (!top.length) {
    return [
      {
        author: "ia",
        body: "Ainda não há imóveis publicados que combinem com o que você procura. Assim que entrar um, ele aparece aqui.",
      },
    ];
  }
  const cards: ChatCard[] = top.map((r) => ({
    property_id: r.property.id,
    score: r.score,
    reasons: r.reasons.slice(0, 3).map((x) => ({ band: x.band, text: x.text })),
  }));
  const ids = cards.map((c) => c.property_id);
  const intro = !previous
    ? `Encontrei ${top.length === 1 ? "1 imóvel que combina" : `${top.length} imóveis que combinam`} com a sua rotina.`
    : JSON.stringify(previous) === JSON.stringify(ids)
      ? "Recomendações atualizadas. Seu top 3 continua o mesmo."
      : "Recomendações atualizadas: seu top 3 mudou.";
  return [
    { author: "ia", body: intro, cards },
    ...(!previous ? [{ author: "ia" as const, body: "Quer ajustar alguma coisa? Pode pedir do seu jeito." }] : []),
  ];
}

type AiOutcome =
  | { kind: "ok"; reply: string; update: ProfileUpdate }
  | { kind: "limite" | "sem_ia" | "erro" };

async function interpretWithAi(userId: string, profile: Profile, pending: string | null, text: string): Promise<AiOutcome> {
  const admin = createAdminClient();
  if (!admin || !isAiConfigured()) return { kind: "sem_ia" };
  const [used, limit] = await Promise.all([aiMessagesToday(admin, userId), dailyLimit(admin)]);
  if (used >= limit) {
    await logAiAction(admin, { actor: "konexya_chat", status: "limite", clientId: userId, reachedClient: false });
    return { kind: "limite" };
  }

  const supabase = await createClient();
  const previous = await lastCards(userId);
  const [{ data: history }, { data: props }] = await Promise.all([
    supabase
      .from("profile_chat_messages")
      .select("author, body")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(12),
    previous?.length
      ? supabase.from("properties").select("*").in("id", previous).eq("status", "publicado")
      : Promise.resolve({ data: [] }),
  ]);
  const turns = (history ?? []).reverse().slice(0, -1);
  const transcript = turns.map((m) => `${m.author === "cliente" ? "Cliente" : "Konexya"}: ${m.body}`).join("\n");

  try {
    const result = await generateStructured({
      schema: chatOutputSchema,
      system: chatSystemPrompt({ profile, pendingQuestion: pending, properties: props ?? [] }),
      messages: [
        {
          role: "user",
          content: `${transcript ? `CONVERSA RECENTE:\n${transcript}\n\n` : ""}<mensagem_do_cliente>${text}</mensagem_do_cliente>`,
        },
      ],
      effort: "low",
    });
    const update = sanitizeChatUpdates(result.data.updates);
    const reply = fixPra(result.data.reply.trim());
    await logAiAction(admin, {
      actor: "konexya_chat",
      status: "ok",
      clientId: userId,
      model: result.model,
      reachedClient: true,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      output: { reply, update } as Json,
    });
    return { kind: "ok", reply, update };
  } catch (error) {
    const reason = error instanceof AiError ? error.reason : "erro";
    await logAiAction(admin, {
      actor: "konexya_chat",
      status: reason === "invalido" ? "invalido" : "erro",
      clientId: userId,
      model: serverEnv().ANTHROPIC_MODEL,
      reachedClient: false,
      output: { error: error instanceof Error ? error.message : String(error) },
    });
    return { kind: "erro" };
  }
}
