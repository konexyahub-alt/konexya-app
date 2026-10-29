"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDraftingMember } from "@/lib/auth";
import { STEP_SCHEMAS, fieldErrors, publishProblems } from "@/lib/property-form";
import type { PropertyStatus } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";

export type StepResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function createDraft() {
  const { membership } = await requireDraftingMember("/painel/imoveis");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ agency_id: membership.agencyId })
    .select("id")
    .single();
  if (error || !data) throw new Error("Não conseguimos criar o imóvel.");
  redirect(`/painel/imoveis/${data.id}`);
}

/** Salva um passo do cadastro. Os dados chegam como objeto simples já montado pelo formulário. */
export async function saveStep(id: string, step: number, values: Record<string, unknown>): Promise<StepResult> {
  await requireDraftingMember(`/painel/imoveis/${id}`);
  const schema = STEP_SCHEMAS[step];
  if (!schema) return { ok: false, error: "Passo inválido." };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("properties").update(parsed.data).eq("id", id);
  if (error) {
    if (error.code === "23514" && error.message.includes("corretor"))
      return { ok: false, fieldErrors: { broker_id: error.message } };
    if (error.code === "23514") return { ok: false, error: "Alguns dados não foram aceitos. Confira e tente de novo." };
    return { ok: false, error: "Não conseguimos salvar. Tente de novo." };
  }
  revalidatePath("/painel/imoveis");
  return { ok: true };
}

export async function setStatus(id: string, status: PropertyStatus): Promise<StepResult> {
  const { canPublish } = await requireDraftingMember(`/painel/imoveis/${id}`);
  const supabase = await createClient();
  if (status === "publicado" && !canPublish) {
    return { ok: false, error: "Publicar fica liberado quando a Konexya aprovar seu cadastro. Até lá, o imóvel fica salvo como rascunho." };
  }
  if (status === "publicado") {
    const { data } = await supabase.from("properties").select("title, price, neighborhood").eq("id", id).single();
    const problems = data ? publishProblems(data) : ["Imóvel não encontrado."];
    if (problems.length) return { ok: false, error: problems.join(" ") };
  }
  const { error } = await supabase.from("properties").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Não conseguimos mudar o status. Tente de novo." };
  revalidatePath("/painel/imoveis");
  revalidatePath(`/painel/imoveis/${id}`);
  return { ok: true };
}

export async function addPhotos(id: string, paths: string[]): Promise<StepResult> {
  await requireDraftingMember(`/painel/imoveis/${id}`);
  const supabase = await createClient();
  const { data: existing } = await supabase.from("property_photos").select("position, is_cover").eq("property_id", id);
  const start = Math.max(-1, ...(existing ?? []).map((p) => p.position)) + 1;
  const hasCover = (existing ?? []).some((p) => p.is_cover);
  const rows = paths.map((storage_path, i) => ({
    property_id: id,
    storage_path,
    position: start + i,
    is_cover: !hasCover && i === 0,
  }));
  const { error } = await supabase.from("property_photos").insert(rows);
  if (error) return { ok: false, error: "Não conseguimos salvar as fotos. Tente de novo." };
  return { ok: true };
}

/** Nova ordem das fotos (lista de ids na ordem desejada). A primeira vira a capa. */
export async function reorderPhotos(id: string, photoIds: string[]): Promise<StepResult> {
  await requireDraftingMember(`/painel/imoveis/${id}`);
  const supabase = await createClient();
  // Tira a capa antes, por causa do índice "uma capa por imóvel".
  await supabase.from("property_photos").update({ is_cover: false }).eq("property_id", id);
  for (const [position, photoId] of photoIds.entries()) {
    const { error } = await supabase
      .from("property_photos")
      .update({ position, is_cover: position === 0 })
      .eq("id", photoId)
      .eq("property_id", id);
    if (error) return { ok: false, error: "Não conseguimos reordenar as fotos." };
  }
  return { ok: true };
}

export async function removePhoto(id: string, photoId: string): Promise<StepResult> {
  await requireDraftingMember(`/painel/imoveis/${id}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_photos")
    .delete()
    .eq("id", photoId)
    .eq("property_id", id)
    .select("storage_path, is_cover")
    .single();
  if (data?.storage_path) await supabase.storage.from("imoveis").remove([data.storage_path]);
  if (data?.is_cover) {
    const { data: first } = await supabase
      .from("property_photos")
      .select("id")
      .eq("property_id", id)
      .order("position")
      .limit(1)
      .maybeSingle();
    if (first) await supabase.from("property_photos").update({ is_cover: true }).eq("id", first.id);
  }
  return { ok: true };
}
