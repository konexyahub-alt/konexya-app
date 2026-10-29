"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireApprovedMember } from "@/lib/auth";
import { CLOSED_STAGES, OPEN_STAGES } from "@/lib/leads";
import { refreshLeadBrief } from "@/lib/lead-service";
import { friendlyDbError } from "@/lib/db-errors";
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

// ---------------------------------------------------------------------------------------------------
// Visitas e propostas (etapa 3). Regra 4: só a equipe do lead confirma visitas e encaminha propostas;
// o banco confere em cada função.
// ---------------------------------------------------------------------------------------------------
const isoList = z.array(z.string().datetime()).min(1, "Escolha pelo menos um horário.").max(3, "Sugira até 3 horários.");

export async function suggestVisitSlots(leadId: string, propertyId: string, slots: string[]): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const parsed = isoList.safeParse(slots);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("suggest_visit_slots", { p_lead: leadId, p_property: propertyId, p_slots: parsed.data });
  const msg = friendlyDbError(error, "Não conseguimos enviar os horários. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function scheduleVisit(leadId: string, propertyId: string, at: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  if (!z.string().datetime().safeParse(at).success) return { error: "Escolha a data e a hora." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_visit", { p_lead: leadId, p_property: propertyId, p_at: at });
  const msg = friendlyDbError(error, "Não conseguimos marcar a visita. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function confirmVisit(visitId: string): Promise<Result> {
  await requireApprovedMember("/painel/agenda");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_visit", { p_visit: visitId });
  const msg = friendlyDbError(error, "Não conseguimos confirmar. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function rescheduleVisit(visitId: string, at: string): Promise<Result> {
  await requireApprovedMember("/painel/agenda");
  if (!z.string().datetime().safeParse(at).success) return { error: "Escolha a nova data e hora." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_visit", { p_visit: visitId, p_at: at });
  const msg = friendlyDbError(error, "Não conseguimos remarcar. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function closeVisit(visitId: string, status: "realizada" | "nao_compareceu" | "cancelada"): Promise<Result> {
  await requireApprovedMember("/painel/agenda");
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_visit", { p_visit: visitId, p_status: status });
  const msg = friendlyDbError(error, "Não conseguimos atualizar a visita. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

/**
 * "Outro horário" na agenda: cancela o pedido e manda até 3 novos horários ao cliente, em nome do corretor.
 * Usado quando dois clientes pediram o mesmo horário: confirma um e oferece outros ao segundo.
 */
export async function offerOtherTimes(visitId: string, slots: string[]): Promise<Result> {
  await requireApprovedMember("/painel/agenda");
  const parsed = isoList.safeParse(slots);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.some((s) => new Date(s).getTime() < Date.now())) return { error: "Escolha horários no futuro." };
  const supabase = await createClient();
  const { data: visit } = await supabase.from("visits").select("lead_id, property_id, status").eq("id", visitId).maybeSingle();
  if (!visit) return { error: "Visita não encontrada." };
  if (visit.status !== "pedida" || !visit.property_id) return { error: "Esta visita não está aguardando confirmação." };
  const closed = await supabase.rpc("close_visit", { p_visit: visitId, p_status: "cancelada", p_note: "Outro horário sugerido" });
  const closeMsg = friendlyDbError(closed.error, "Não conseguimos atualizar a visita. Tente de novo.");
  if (closeMsg) return { error: closeMsg };
  const { error } = await supabase.rpc("suggest_visit_slots", { p_lead: visit.lead_id, p_property: visit.property_id, p_slots: parsed.data });
  const msg = friendlyDbError(error, "O pedido foi cancelado, mas os novos horários não foram enviados. Envie pela conversa do lead.");
  refresh();
  return msg ? { error: msg } : {};
}

const amount = z.number().positive("Informe um valor maior que zero.").max(1_000_000_000, "Valor alto demais.");

export async function registerProposal(leadId: string, propertyId: string, value: number, note: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const parsed = amount.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("make_proposal", {
    p_lead: leadId,
    p_property: propertyId,
    p_amount: parsed.data,
    p_note: note.trim().slice(0, 300) || undefined,
  });
  const msg = friendlyDbError(error, "Não conseguimos registrar a proposta. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function forwardProposal(proposalId: string): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  const supabase = await createClient();
  const { error } = await supabase.rpc("forward_proposal", { p_proposal: proposalId });
  const msg = friendlyDbError(error, "Não conseguimos marcar como encaminhada. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function answerProposal(
  proposalId: string,
  status: "aceita" | "recusada" | "contraproposta",
  counter?: number,
): Promise<Result> {
  await requireApprovedMember("/painel/leads");
  if (status === "contraproposta" && !amount.safeParse(counter).success) return { error: "Informe o valor da contraproposta." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_proposal", { p_proposal: proposalId, p_status: status, p_counter: counter });
  const msg = friendlyDbError(error, "Não conseguimos registrar a resposta. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}
