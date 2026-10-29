"use server";

import { cookies } from "next/headers";
import { RETURNING_COOKIE } from "@/lib/returning";
import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { processChatMessage, refreshRecommendations } from "@/lib/chat-service";
import { profileUpdateSchema } from "@/lib/profile-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleClientLeadMessage, refreshLeadBrief, startLeadConversation } from "@/lib/lead-service";
import { requireUser, safeNext, TERMS_VERSION } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { personNameSchema } from "@/lib/validation";

export type FormState = { error?: string };

export async function acceptTerms(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("/app/entrar");
  if (form.get("aceite") !== "on") return { error: "Marque a caixa para continuar." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { error } = await supabase
    .from("consents")
    .insert({ user_id: auth!.claims.sub, kind: "termos", document_version: TERMS_VERSION });
  if (error) return { error: "Não conseguimos salvar seu aceite. Tente de novo." };
  redirect(safeNext(String(form.get("next") ?? ""), "/app"));
}

export async function saveName(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/app/entrar");
  const parsed = personNameSchema.safeParse(form.get("nome"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").upsert({ user_id: user.id, name: parsed.data });
  if (error) return { error: "Não conseguimos salvar seu nome. Tente de novo." };
  redirect(safeNext(String(form.get("next") ?? ""), "/app"));
}

export async function signOut(form: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(safeNext(String(form.get("next") ?? ""), "/app/boas-vindas"));
}

// ---------------------------------------------------------------------------------------------------
// Conversa (C-04)
// ---------------------------------------------------------------------------------------------------
export async function sendChatMessage(text: string): Promise<void> {
  const user = await requireUser("/app/entrar");
  await processChatMessage(user.id, String(text ?? ""));
  refresh();
}

/** "Tentar de novo": reprocessa a última mensagem do cliente sem duplicá-la. */
export async function retryChat(): Promise<void> {
  const user = await requireUser("/app/entrar");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_chat_messages")
    .select("body")
    .eq("user_id", user.id)
    .eq("author", "cliente")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) await processChatMessage(user.id, data.body, { retry: true });
  refresh();
}

// ---------------------------------------------------------------------------------------------------
// Ficha (C-07), salvar e consentimento (C-10, fluxo F4)
// ---------------------------------------------------------------------------------------------------
export async function toggleFavorite(propertyId: string, save: boolean): Promise<{ error?: string }> {
  const user = await requireUser("/app/entrar");
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("favorites").upsert({ user_id: user.id, property_id: propertyId }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", propertyId);
  if (error) return { error: "Não conseguimos salvar agora. Tente de novo." };
  refresh();
  return {};
}

/**
 * "Autorizar e falar com o corretor": registra o consentimento para esta imobiliária e cria (ou reabre)
 * o lead no banco; depois a assistente dá as boas-vindas e a IA prepara o resumo para o corretor.
 */
export async function shareProfile(propertyId: string): Promise<{ error?: string }> {
  await requireUser("/app/entrar");
  const supabase = await createClient();
  const { data: leadId, error } = await supabase.rpc("share_profile", { p_property: propertyId });
  if (error || !leadId) {
    return { error: error?.code === "P0002" ? "Este imóvel não está mais disponível." : "Não conseguimos enviar agora. Tente de novo." };
  }
  // Só no primeiro compartilhamento (ou reabertura sem conversa aberta) a assistente se apresenta.
  await startLeadConversation(leadId);
  after(() => refreshLeadBrief(leadId));
  redirect(`/app/corretor/${leadId}`);
}

// ---------------------------------------------------------------------------------------------------
// Conversa com a imobiliária (C-11)
// ---------------------------------------------------------------------------------------------------
export async function sendLeadMessage(leadId: string, text: string): Promise<{ error?: string }> {
  const user = await requireUser("/app/entrar");
  const body = String(text ?? "").trim().slice(0, 2000);
  if (!body) return {};
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_messages")
    .insert({ lead_id: leadId, sender: "cliente", author_id: user.id, body });
  if (error) return { error: "Não conseguimos enviar. Tente de novo." };
  await handleClientLeadMessage(leadId, body);
  refresh();
  return {};
}

export async function revokeShare(agencyId: string): Promise<{ error?: string }> {
  await requireUser("/app/entrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_share", { p_agency: agencyId });
  if (error) return { error: "Não conseguimos revogar agora. Tente de novo." };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------------------------------
// Perfil (C-05)
// ---------------------------------------------------------------------------------------------------
export async function updateProfile(update: unknown): Promise<{ error?: string; recalculated?: boolean }> {
  const user = await requireUser("/app/entrar");
  const parsed = profileUpdateSchema.safeParse(update);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").update(parsed.data).eq("user_id", user.id);
  if (error) return { error: "Não conseguimos salvar agora. Tente de novo." };
  const recalculated = await refreshRecommendations(user.id);
  refresh();
  return { recalculated };
}

/** Excluir minha conta (regra 12). As imobiliárias guardam só o que já tinham recebido com autorização. */
export async function deleteAccount(): Promise<{ error?: string }> {
  const user = await requireUser("/app/entrar");
  const admin = createAdminClient();
  if (!admin) return { error: "Não conseguimos excluir agora. Tente de novo mais tarde." };
  const supabase = await createClient();
  const { data: conversations } = await supabase.rpc("my_conversations");
  for (const c of conversations ?? []) {
    if (!c.revoked) await supabase.rpc("revoke_share", { p_agency: c.agency_id });
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Não conseguimos excluir agora. Tente de novo mais tarde." };
  await supabase.auth.signOut();
  // Conta excluída: o aparelho volta a mostrar "Começar".
  (await cookies()).delete(RETURNING_COOKIE);
  redirect("/app/boas-vindas");
}

// ---------------------------------------------------------------------------------------------------
// Visitas e propostas do cliente (etapa 3). Regra 4: o cliente pede; quem confirma e encaminha é o corretor.
// ---------------------------------------------------------------------------------------------------
export async function requestVisit(messageId: number, slot: number): Promise<{ error?: string }> {
  await requireUser("/app/entrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_visit", { p_message: messageId, p_slot: slot });
  const msg = friendlyDbError(error, "Não conseguimos pedir a visita. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function cancelMyVisit(visitId: string): Promise<{ error?: string }> {
  await requireUser("/app/entrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_visit", { p_visit: visitId, p_status: "cancelada" });
  const msg = friendlyDbError(error, "Não conseguimos cancelar. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}

export async function makeProposal(leadId: string, propertyId: string, value: number, note: string): Promise<{ error?: string }> {
  await requireUser("/app/entrar");
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) return { error: "Informe um valor válido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("make_proposal", {
    p_lead: leadId,
    p_property: propertyId,
    p_amount: value,
    p_note: note.trim().slice(0, 300) || undefined,
  });
  const msg = friendlyDbError(error, "Não conseguimos enviar a proposta. Tente de novo.");
  if (msg) return { error: msg };
  refresh();
  return {};
}
