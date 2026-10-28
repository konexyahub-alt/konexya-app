import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import type { AdminClient } from "@/lib/supabase/admin";

/** Ações da IA que chegam (ou podem chegar) ao cliente ficam registradas (regra 10). */
export type AiActor = "konexya_chat" | "assistente" | "resumo_lead" | "sugestao_mensagem";

export async function logAiAction(
  admin: AdminClient,
  entry: {
    actor: AiActor;
    status: "ok" | "erro" | "invalido" | "limite";
    clientId?: string | null;
    agencyId?: string | null;
    leadId?: string | null;
    model?: string | null;
    reachedClient: boolean;
    inputTokens?: number | null;
    outputTokens?: number | null;
    output?: Json;
  },
) {
  const { error } = await admin.from("ai_action_log").insert({
    actor: entry.actor,
    status: entry.status,
    client_id: entry.clientId ?? null,
    agency_id: entry.agencyId ?? null,
    lead_id: entry.leadId ?? null,
    model: entry.model ?? null,
    reached_client: entry.reachedClient,
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
    output: entry.output ?? null,
  });
  if (error) console.error("ai_action_log", error.message);
}

/** Início do dia em Fortaleza (UTC−3, sem horário de verão), em ISO. */
export function startOfDayFortaleza(now = new Date()): string {
  const local = new Date(now.getTime() - 3 * 3600_000);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(day + 3 * 3600_000).toISOString();
}

/**
 * Quantas mensagens de IA o cliente já gastou hoje (regra 11). Contam as respostas da IA da Konexya e da
 * assistente da imobiliária que usaram o modelo; respostas rápidas e textos fixos não usam o modelo e não contam.
 */
export async function aiMessagesToday(admin: AdminClient, clientId: string): Promise<number> {
  const { count } = await admin
    .from("ai_action_log")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .in("actor", ["konexya_chat", "assistente"])
    .not("model", "is", null)
    .gte("created_at", startOfDayFortaleza());
  return count ?? 0;
}

export async function dailyLimit(admin: AdminClient): Promise<number> {
  const { data } = await admin.from("platform_settings").select("ai_daily_limit").eq("id", 1).maybeSingle();
  return data?.ai_daily_limit ?? 60;
}
