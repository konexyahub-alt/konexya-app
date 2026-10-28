"use server";

import { refresh } from "next/cache";
import { assistantSettingsSchema } from "@/lib/assistant";
import { requireApprovedMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** P-10 · Só o gestor edita a assistente virtual (o RLS confere de novo no banco). */
export async function saveAssistantSettings(input: unknown): Promise<{ error?: string }> {
  const { user, membership } = await requireApprovedMember("/painel/assistente");
  if (membership.role !== "gestor") return { error: "Só o gestor edita a assistente virtual." };
  const parsed = assistantSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agency_assistant_settings")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("agency_id", membership.agencyId)
    .select("agency_id");
  if (error || !data?.length) return { error: "Não conseguimos salvar. Tente de novo." };
  refresh();
  return {};
}
