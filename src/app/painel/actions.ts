"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { partnerSchema, personNameSchema } from "@/lib/validation";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

export async function registerAgency(_: FormState, form: FormData): Promise<FormState> {
  await requireUser("/painel/entrar", "/painel/parceiro");
  if (form.get("aceite") !== "on") return { error: "Marque a caixa do termo de parceria para continuar." };
  const parsed = partnerSchema.safeParse({
    legalName: form.get("legalName"),
    cnpj: form.get("cnpj"),
    creci: form.get("creci"),
    managerName: form.get("managerName"),
    whatsapp: form.get("whatsapp"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_agency", {
    p_legal_name: d.legalName,
    p_cnpj: d.cnpj,
    p_creci: d.creci,
    p_manager_name: d.managerName,
    p_whatsapp: d.whatsapp,
  });
  if (error) {
    if (error.code === "23505" && error.message.includes("cnpj"))
      return { fieldErrors: { cnpj: "Este CNPJ já tem cadastro na Konexya. Fale com o gestor da sua imobiliária." } };
    if (error.code === "23505") return { error: error.message };
    return { error: "Não conseguimos enviar o cadastro. Tente de novo." };
  }
  redirect("/painel");
}

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  await requireUser("/painel/entrar", `/painel/convite/${token}`);
  const name = personNameSchema.safeParse(form.get("nome"));
  if (!name.success) return { fieldErrors: { nome: name.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_agency_invite", {
    p_token: token,
    p_name: name.data,
    p_creci: String(form.get("creci") ?? ""),
  });
  if (error) {
    const known = ["P0002", "22023", "42501", "23505"];
    return { error: known.includes(error.code) ? error.message : "Não conseguimos aceitar o convite. Tente de novo." };
  }
  redirect("/painel");
}

/** Convite aberto com a conta errada: sai e volta ao mesmo convite pelo login. */
export async function switchInviteAccount(token: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/painel/entrar?next=${encodeURIComponent(`/painel/convite/${token}`)}`);
}

export async function panelSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/painel/entrar");
}
