"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function reviewAgency(agencyId: string, status: "aprovada" | "recusada" | "suspensa") {
  await requireUser("/painel/entrar", "/admin");
  if (!(await isPlatformAdmin())) throw new Error("Acesso negado.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_agency", { p_agency: agencyId, p_status: status });
  if (error) return { ok: false, error: "Não conseguimos salvar a decisão. Tente de novo." };
  // A tela de cadastro em análise promete um e-mail quando o acesso for liberado.
  if (status === "aprovada") {
    const { data: agency } = await supabase
      .from("agencies")
      .select("legal_name, manager_name, manager_email")
      .eq("id", agencyId)
      .maybeSingle();
    if (agency?.manager_email) {
      const h = await headers();
      const link = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/painel`;
      await sendEmail(
        agency.manager_email,
        "Seu acesso ao painel da Konexya foi liberado",
        `<div style="font-family:Arial,sans-serif;color:#151516;max-width:480px">
          <p>Olá, ${escapeHtml(agency.manager_name)}. O cadastro da <b>${escapeHtml(agency.legal_name)}</b> foi conferido e o painel já está liberado.</p>
          <p><a href="${link}" style="display:inline-block;background:#0b0b0c;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Entrar no painel</a></p></div>`,
      );
    }
  }
  revalidatePath("/admin");
  return { ok: true };
}
