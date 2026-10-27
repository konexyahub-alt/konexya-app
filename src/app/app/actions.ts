"use server";

import { redirect } from "next/navigation";
import { requireUser, safeNext, TERMS_VERSION } from "@/lib/auth";
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
