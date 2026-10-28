"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireApprovedMember } from "@/lib/auth";
import { CLOSED_STAGES, OPEN_STAGES } from "@/lib/leads";
import { refreshLeadBrief } from "@/lib/lead-service";
import { createClient } from "@/lib/supabase/server";

/**
 * Ações do corretor no lead (P-04). Toda mensagem em nome do corretor sai daqui, com o usuário dele
 * (regra 3): aprovar a sugestão da IA, editar antes de enviar ou escrever do zero. O banco confere que
 * quem envia é da equipe do lead.
 */
type Result = { error?: string };
const body = z.string().trim().min(1, "Escreva a mensagem.").max(4000, "A mensagem pode ter até 4.000 caracteres.");

export async function sendBrokerMessage(leadId: string, text: string): Promise<Result> {
  const { user } = await requireApprovedMember("/painel/leads");
  const parsed = body.safeParse(text);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_messages")
    .insert({ lead_id: leadId, sender: "corretor", author_id: user.id, body: parsed.data });
  if (error) return { error: "Não conseguimos enviar. Confira se o lead ainda está com você e tente de novo." };
  refresh();
  return {};
}

/** Aprovar e enviar (como está) ou enviar a versão editada. A sugestão nunca sai sozinha. */
export async function approveSuggestion(suggestionId: string, editedText?: string): Promise<Result> {
  const { user } = await requireApprovedMember("/painel/leads");
  const supabase = await createClient();
  const { data: s } = await supabase.from("ai_suggestions").select("id, lead_id, body, status").eq("id", suggestionId).maybeSingle();
  if (!s || s.status !== "pendente") return { error: "Esta sugestão não está mais disponível." };
  const finalText = editedText === undefined ? s.body : editedText;
  const parsed = body.safeParse(finalText);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const edited = parsed.data !== s.body.trim();
  const { error } = await supabase
    .from("lead_messages")
    .insert({ lead_id: s.lead_id, sender: "corretor", author_id: user.id, body: parsed.data });
  if (error) return { error: "Não conseguimos enviar. Tente de novo." };
  await supabase
    .from("ai_suggestions")
    .update({ status: edited ? "editada" : "aprovada", final_body: parsed.data })
    .eq("id", s.id);
  refresh();
  return {};
}

export async function discardSuggestion(suggestionId: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const supabase = await createClient();
  const { error } = await supabase.from("ai_suggestions").update({ status: "descartada" }).eq("id", suggestionId).eq("status", "pendente");
  if (error) return { error: "Não conseguimos descartar. Tente de novo." };
  refresh();
  return {};
}

/** "Sugerir resposta": a IA escreve uma proposta para o corretor revisar. */
export async function suggestReply(leadId: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (!lead) return { error: "Lead não encontrado." };
  const ok = await refreshLeadBrief(leadId, { reply: true });
  if (!ok) return { error: "Não consegui sugerir agora. Escreva do seu jeito ou tente de novo." };
  refresh();
  return {};
}

const stageSchema = z.object({
  stage: z.enum([...OPEN_STAGES, ...CLOSED_STAGES] as [string, ...string[]]),
  lostReason: z.enum(["preco", "localizacao", "desistiu", "comprou_com_outro", "sem_resposta", "outro"]).nullable(),
  note: z.string().trim().max(300).nullable(),
});

export async function moveStage(
  leadId: string,
  stage: string,
  lostReason: string | null = null,
  note: string | null = null,
): Promise<Result> {
  await requireApprovedMember("/painel/funil");
  const parsed = stageSchema.safeParse({ stage, lostReason, note });
  if (!parsed.success) return { error: "Etapa inválida." };
  if (parsed.data.stage === "perdido" && !parsed.data.lostReason) return { error: "Escolha o motivo da perda." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      stage: parsed.data.stage as never,
      lost_reason: parsed.data.stage === "perdido" ? (parsed.data.lostReason as never) : null,
      lost_note: parsed.data.stage === "perdido" ? parsed.data.note || null : null,
    })
    .eq("id", leadId)
    .select("id");
  if (error || !data?.length) return { error: "Não conseguimos mover o lead. Tente de novo." };
  refresh();
  return {};
}

export async function assignBroker(leadId: string, brokerId: string): Promise<Result> {
  const { membership } = await requireApprovedMember("/painel/leads");
  if (membership.role !== "gestor") return { error: "Só o gestor troca o corretor responsável." };
  if (!z.uuid().safeParse(brokerId).success) return { error: "Escolha alguém da equipe." };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ broker_id: brokerId }).eq("id", leadId);
  if (error) return { error: "Não conseguimos trocar o responsável. Tente de novo." };
  refresh();
  return {};
}

export async function addNote(leadId: string, text: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const parsed = z.string().trim().min(1, "Escreva a anotação.").max(2000).safeParse(text);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("internal_notes").insert({ lead_id: leadId, body: parsed.data });
  if (error) return { error: "Não conseguimos salvar a anotação. Tente de novo." };
  refresh();
  return {};
}
