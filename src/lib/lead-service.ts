import "server-only";
import { after } from "next/server";
import { AiError, generateStructured, isAiConfigured } from "@/lib/ai/client";
import { aiMessagesToday, dailyLimit, logAiAction } from "@/lib/ai/log";
import {
  assistantOutputSchema,
  assistantSystemPrompt,
  fixPra,
  leadBriefPrompt,
  leadBriefSchema,
  type AssistantOutput,
} from "@/lib/ai/prompts";
import {
  STANDARD_QUESTIONS,
  isStandardQuestion,
  matchOption,
  nextQueuedQuestion,
  parseQuestions,
  questionOptions,
  renderMessage,
  type AssistantQuestion,
  type CustomAnswer,
  type Qualification,
} from "@/lib/assistant";
import { serverEnv } from "@/lib/env";
import { toProfile } from "@/lib/profile";
import { loadScoringSettings } from "@/lib/recommendations";
import { scoreProperty } from "@/lib/scoring";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * O que acontece no lead fora das mãos do corretor: a assistente virtual da imobiliária (boas-vindas,
 * perguntas, respostas só com dados do anúncio, encaminhamento ao corretor, despedida) e o resumo com a
 * mensagem sugerida. Tudo gravado com a chave secreta; o navegador nunca escreve como assistente.
 */
export const NO_ASSISTANT_TEXT = "Seu perfil já está com o corretor. Continue a conversa por aqui.";
const ACK = "Anotado!";

async function loadLead(admin: AdminClient, leadId: string) {
  const { data: lead, error } = await admin.from("leads").select("*").eq("id", leadId).single();
  if (!lead) {
    console.error("lead-service: lead não carregado (confira SUPABASE_SECRET_KEY)", leadId, error?.message);
    return null;
  }
  const [{ data: settings }, { data: agency }] = await Promise.all([
    admin.from("agency_assistant_settings").select("*").eq("agency_id", lead.agency_id).single(),
    admin.from("agencies").select("legal_name").eq("id", lead.agency_id).single(),
  ]);
  if (!settings || !agency) {
    console.error("lead-service: configuração da assistente ou imobiliária ausente", lead.agency_id);
    return null;
  }
  return { lead, settings, agencyName: agency.legal_name, questions: parseQuestions(settings.questions) };
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadLead>>>;

async function say(
  admin: AdminClient,
  ctx: Loaded,
  body: string,
  opts: { quickReplies?: string[]; sender?: "assistente" | "sistema"; model?: string | null; tokens?: [number, number] } = {},
) {
  const sender = opts.sender ?? "assistente";
  const text = fixPra(body);
  const { error } = await admin
    .from("lead_messages")
    .insert({ lead_id: ctx.lead.id, sender, body: text, quick_replies: opts.quickReplies ?? [] });
  if (error) console.error("lead-service: mensagem não gravada", ctx.lead.id, error.message);
  if (sender === "assistente") {
    await logAiAction(admin, {
      actor: "assistente",
      status: "ok",
      clientId: ctx.lead.client_id,
      agencyId: ctx.lead.agency_id,
      leadId: ctx.lead.id,
      model: opts.model ?? null,
      reachedClient: true,
      inputTokens: opts.tokens?.[0],
      outputTokens: opts.tokens?.[1],
      output: { text },
    });
  }
}

/** Pergunta em aberto (a primeira da fila que ainda está ligada e não foi respondida). */
function pendingQuestion(ctx: Loaded) {
  const qualification = (ctx.lead.qualification ?? {}) as Qualification;
  const queue = ctx.lead.assistant_queue.filter((id) => !(isStandardQuestion(id) && qualification[id]));
  return nextQueuedQuestion(queue, ctx.questions);
}

async function ask(admin: AdminClient, ctx: Loaded, q: AssistantQuestion) {
  await say(admin, ctx, q.text, { quickReplies: questionOptions(q.id) });
}

/**
 * Depois do consentimento: boas-vindas e primeira pergunta, ou o aviso de que o corretor já recebeu.
 * O resumo para o corretor (refreshLeadBrief) roda depois, sem segurar a tela do cliente.
 */
export async function startLeadConversation(leadId: string) {
  const admin = createAdminClient();
  if (!admin) {
    console.error("lead-service: SUPABASE_SECRET_KEY ausente; a assistente não pode falar");
    return;
  }
  const ctx = await loadLead(admin, leadId);
  if (!ctx || ctx.lead.consent_revoked_at) return;
  // Idempotente: só começa se a conversa ainda não foi aberta (pela assistente ou pelo aviso sem assistente).
  const { data: sent } = await admin.from("lead_messages").select("sender, body").eq("lead_id", leadId).neq("sender", "cliente");
  if ((sent ?? []).some((m) => m.sender === "assistente" || m.body === NO_ASSISTANT_TEXT)) return;
  if (!ctx.lead.assistant_active || ctx.lead.first_human_response_at) {
    await say(admin, ctx, NO_ASSISTANT_TEXT, { sender: "sistema" });
  } else {
    const vars = { clientName: ctx.lead.client_name, assistantName: ctx.settings.name };
    await say(admin, ctx, renderMessage(ctx.settings.welcome_message, vars));
    const next = pendingQuestion(ctx);
    if (next) {
      await admin.from("leads").update({ assistant_queue: [next.question.id, ...next.rest] }).eq("id", leadId);
      await ask(admin, ctx, next.question);
    } else await finish(admin, ctx);
  }
}

async function finish(admin: AdminClient, ctx: Loaded) {
  await admin.from("leads").update({ assistant_queue: [], assistant_finished_at: new Date().toISOString() }).eq("id", ctx.lead.id);
  await say(admin, ctx, renderMessage(ctx.settings.farewell_message, { clientName: ctx.lead.client_name, assistantName: ctx.settings.name }));
}

/**
 * Mensagem do cliente no lead. Se a assistente ainda estiver atendendo, ela registra a resposta, responde
 * dúvida com dado do anúncio ou encaminha ao corretor, e segue para a próxima pergunta.
 */
export async function handleClientLeadMessage(leadId: string, text: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const ctx = await loadLead(admin, leadId);
  if (!ctx || !ctx.lead.assistant_active || ctx.lead.first_human_response_at || ctx.lead.consent_revoked_at) return;
  const pending = pendingQuestion(ctx);

  // Botão de uma pergunta padrão: registra sem usar IA.
  if (pending && isStandardQuestion(pending.question.id)) {
    const option = matchOption(pending.question.id, text);
    if (option) return recordAnswer(admin, ctx, pending, { option });
  }

  const ai = await interpret(admin, ctx, pending?.question ?? null, text);
  if (ai === "limite" || ai === "erro") {
    // Sem IA: pergunta própria aceita o texto como resposta; o que parece pergunta vai para o corretor.
    if (text.trim().endsWith("?")) {
      await forward(admin, ctx, text, "Vou deixar essa pergunta para o corretor, que responde em breve.");
      if (pending) await ask(admin, ctx, pending.question);
    } else if (pending && !isStandardQuestion(pending.question.id)) {
      await recordAnswer(admin, ctx, pending, { answer: text.trim().slice(0, 300) });
    } else if (pending) {
      await say(admin, ctx, "Para eu anotar, toque numa das opções abaixo.", { quickReplies: questionOptions(pending.question.id) });
    }
    return;
  }

  const { data, model, tokens } = ai;
  if (data.kind === "resposta" && pending) {
    if (isStandardQuestion(pending.question.id)) {
      const option = data.option ? matchOption(pending.question.id, data.option) : null;
      if (option) return recordAnswer(admin, ctx, pending, { option, reply: data.reply, model, tokens });
    } else {
      return recordAnswer(admin, ctx, pending, { answer: (data.answer ?? text).trim().slice(0, 300), reply: data.reply, model, tokens });
    }
  }
  if (data.kind === "encaminhar") {
    await forward(admin, ctx, data.forwarded ?? text, data.reply, model, tokens);
  } else {
    await say(admin, ctx, data.reply, { model, tokens });
  }
  if (pending) await ask(admin, ctx, pending.question);
}

async function forward(admin: AdminClient, ctx: Loaded, question: string, reply: string, model?: string, tokens?: [number, number]) {
  await admin.from("lead_questions").insert({ lead_id: ctx.lead.id, body: question.trim().slice(0, 1000) });
  await say(admin, ctx, reply, { model, tokens });
}

async function recordAnswer(
  admin: AdminClient,
  ctx: Loaded,
  pending: NonNullable<ReturnType<typeof pendingQuestion>>,
  a: { option?: string; answer?: string; reply?: string; model?: string; tokens?: [number, number] },
) {
  const now = new Date().toISOString();
  const id = pending.question.id;
  const patch: { qualification?: NonNullable<Json>; custom_answers?: NonNullable<Json>; assistant_queue: string[] } = {
    assistant_queue: pending.rest,
  };
  if (isStandardQuestion(id) && a.option) {
    patch.qualification = { ...((ctx.lead.qualification ?? {}) as Qualification), [id]: { value: a.option, at: now } } as NonNullable<Json>;
  } else if (a.answer) {
    const list = (ctx.lead.custom_answers ?? []) as CustomAnswer[];
    patch.custom_answers = [...list, { question: pending.question.text, answer: a.answer, at: now }] as NonNullable<Json>;
  }
  await admin.from("leads").update(patch).eq("id", ctx.lead.id);
  await say(admin, ctx, a.reply?.trim() || ACK, { model: a.model, tokens: a.tokens });
  const refreshed = await loadLead(admin, ctx.lead.id);
  if (!refreshed) return;
  const next = pendingQuestion(refreshed);
  if (next) await ask(admin, refreshed, next.question);
  else {
    await finish(admin, refreshed);
    after(() => refreshLeadBrief(ctx.lead.id));
  }
}

async function interpret(
  admin: AdminClient,
  ctx: Loaded,
  pending: AssistantQuestion | null,
  text: string,
): Promise<"limite" | "erro" | { data: AssistantOutput; model: string; tokens: [number, number] }> {
  const clientId = ctx.lead.client_id;
  if (!isAiConfigured() || !clientId) return "erro";
  const [used, limit] = await Promise.all([aiMessagesToday(admin, clientId), dailyLimit(admin)]);
  if (used >= limit) {
    await logAiAction(admin, { actor: "assistente", status: "limite", clientId, leadId: ctx.lead.id, agencyId: ctx.lead.agency_id, reachedClient: false });
    return "limite";
  }
  const { data: props } = await admin.from("properties").select("*").in("id", ctx.lead.interest_property_ids);
  try {
    const result = await generateStructured({
      schema: assistantOutputSchema,
      system: assistantSystemPrompt({
        assistantName: ctx.settings.name,
        agencyName: ctx.agencyName,
        clientName: ctx.lead.client_name,
        pendingQuestion: pending ? { text: pending.text, options: questionOptions(pending.id) } : null,
        properties: props ?? [],
      }),
      messages: [{ role: "user", content: `<mensagem_do_cliente>${text.slice(0, 1500)}</mensagem_do_cliente>` }],
      effort: "low",
    });
    return { data: result.data, model: result.model, tokens: [result.inputTokens, result.outputTokens] };
  } catch (error) {
    await logAiAction(admin, {
      actor: "assistente",
      status: error instanceof AiError && error.reason === "invalido" ? "invalido" : "erro",
      clientId,
      leadId: ctx.lead.id,
      agencyId: ctx.lead.agency_id,
      model: serverEnv().ANTHROPIC_MODEL,
      reachedClient: false,
      output: { error: error instanceof Error ? error.message : String(error) },
    });
    return "erro";
  }
}

/**
 * Resumo do perfil e mensagem sugerida para o corretor (P-04). Só enquanto o corretor ainda não respondeu;
 * a sugestão pendente é atualizada, nunca enviada (regra 3).
 */
export async function refreshLeadBrief(leadId: string, opts: { reply?: boolean } = {}): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !isAiConfigured()) return false;
  const { data: lead } = await admin.from("leads").select("*").eq("id", leadId).single();
  if (!lead || lead.consent_revoked_at || (lead.first_human_response_at && !opts.reply)) return false;
  let history: string | undefined;
  if (opts.reply) {
    const { data: msgs } = await admin
      .from("lead_messages")
      .select("sender, body")
      .eq("lead_id", leadId)
      .order("id", { ascending: false })
      .limit(20);
    const who = { cliente: "Cliente", corretor: "Corretor", assistente: "Assistente virtual", sistema: "Sistema" } as const;
    history = (msgs ?? []).reverse().map((m) => `${who[m.sender]}: ${m.body}`).join("\n");
  }

  const profile = toProfile(lead.profile_snapshot as Record<string, unknown>);
  const [{ data: props }, { data: agency }, { data: broker }, { data: questions }, settings] = await Promise.all([
    admin.from("properties").select("*").in("id", lead.interest_property_ids),
    admin.from("agencies").select("legal_name").eq("id", lead.agency_id).single(),
    lead.broker_id
      ? admin.from("agency_members").select("name").eq("agency_id", lead.agency_id).eq("user_id", lead.broker_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("lead_questions").select("body").eq("lead_id", leadId).eq("status", "encaminhada"),
    loadScoringSettings(admin),
  ]);
  const qualification = Object.fromEntries(
    Object.entries((lead.qualification ?? {}) as Qualification).map(([k, v]) => [
      STANDARD_QUESTIONS[k as keyof typeof STANDARD_QUESTIONS]?.label ?? k,
      v?.value ?? "",
    ]),
  );
  try {
    const result = await generateStructured({
      schema: leadBriefSchema,
      system: leadBriefPrompt({
        agencyName: agency?.legal_name ?? "imobiliária",
        brokerName: broker?.name?.split(/\s+/)[0] ?? null,
        profile,
        qualification,
        customAnswers: ((lead.custom_answers ?? []) as CustomAnswer[]).map(({ question, answer }) => ({ question, answer })),
        forwardedQuestions: (questions ?? []).map((q) => q.body),
        properties: (props ?? []).map((p) => {
          const s = scoreProperty(p, profile, settings.weights);
          return { ...p, score: s?.score ?? null, reasons: s?.reasons.map((r) => r.text) ?? [] };
        }),
        history,
      }),
      messages: [{ role: "user", content: "Prepare o resumo e a primeira mensagem." }],
      effort: "medium",
    });
    const summary = fixPra(result.data.summary.trim());
    const suggestion = fixPra(result.data.suggestion.trim());
    await admin.from("leads").update({ ai_summary: summary }).eq("id", leadId);
    const { data: pending } = await admin
      .from("ai_suggestions")
      .select("id")
      .eq("lead_id", leadId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) await admin.from("ai_suggestions").update({ body: suggestion }).eq("id", pending.id);
    else await admin.from("ai_suggestions").insert({ lead_id: leadId, body: suggestion });
    await logAiAction(admin, {
      actor: "resumo_lead",
      status: "ok",
      clientId: lead.client_id,
      agencyId: lead.agency_id,
      leadId,
      model: result.model,
      reachedClient: false,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      output: { summary, suggestion },
    });
    return true;
  } catch (error) {
    await logAiAction(admin, {
      actor: "resumo_lead",
      status: error instanceof AiError && error.reason === "invalido" ? "invalido" : "erro",
      clientId: lead.client_id,
      agencyId: lead.agency_id,
      leadId,
      model: serverEnv().ANTHROPIC_MODEL,
      reachedClient: false,
      output: { error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  }
}
