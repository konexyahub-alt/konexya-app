"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewAgency(agencyId: string, status: "aprovada" | "recusada" | "suspensa") {
  await requireUser("/painel/entrar", "/admin");
  if (!(await isPlatformAdmin())) throw new Error("Acesso negado.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_agency", { p_agency: agencyId, p_status: status });
  if (error) return { ok: false, error: "Não conseguimos salvar a decisão. Tente de novo." };
  revalidatePath("/admin");
  return { ok: true };
}
