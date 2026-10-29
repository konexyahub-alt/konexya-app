import "server-only";
import { KONEXYA_ADMIN_EMAIL } from "@/lib/contacts";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { verifyCnpj, type Check, type Verification } from "@/lib/verification";

/**
 * Cadastro novo de anunciante: confere o CNPJ na Receita (imobiliária), grava o resultado para o Admin e avisa a
 * administração por e-mail. A aprovação continua manual (docs/DECISOES.md, 2026-10-29).
 */
export async function notifyNewAdvertiser(agencyId: string) {
  const admin = createAdminClient();
  if (!admin) {
    console.error("advertiser-review: SUPABASE_SECRET_KEY ausente; cadastro sem conferência automática", agencyId);
    return;
  }
  const { data: agency } = await admin
    .from("agencies")
    .select("kind, legal_name, cnpj, creci, manager_name, manager_email, whatsapp")
    .eq("id", agencyId)
    .single();
  if (!agency) return;

  const verification: Verification = { checkedAt: new Date().toISOString() };
  if (agency.cnpj) verification.cnpj = await verifyCnpj(agency.cnpj, agency.legal_name);
  const { error } = await admin
    .from("agencies")
    .update({ verification: verification as unknown as Json })
    .eq("id", agencyId);
  if (error) console.error("advertiser-review: resultado não gravado", agencyId, error.message);

  const autonomous = agency.kind === "autonomo";
  const lines = verification.cnpj
    ? [verification.cnpj.situacao, verification.cnpj.nome, verification.cnpj.atividade].map(checkLine).join("")
    : "<li>Corretor autônomo: sem CNPJ. Confira o CRECI de pessoa física no site do CRECI-CE.</li>";
  await sendEmail(
    KONEXYA_ADMIN_EMAIL,
    `Novo cadastro para aprovar: ${agency.legal_name}`,
    `<div style="font-family:Arial,sans-serif;color:#151516;max-width:520px">
      <p><b>${escapeHtml(agency.legal_name)}</b> (${autonomous ? "corretor autônomo" : "imobiliária"}) pediu acesso ao painel.</p>
      <p>CRECI ${escapeHtml(agency.creci)} · ${escapeHtml(agency.manager_email)} · WhatsApp ${escapeHtml(agency.whatsapp)}</p>
      <ul>${lines}</ul>
      <p>Abra o Admin da Konexya para aprovar ou recusar.</p>
    </div>`,
  );
}

function checkLine(c: Check) {
  const mark = c.status === "ok" ? "✓" : c.status === "falhou" ? "✗" : "?";
  return `<li>${mark} ${escapeHtml(c.detail)}</li>`;
}
