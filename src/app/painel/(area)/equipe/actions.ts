"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApprovedMember } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation";

export type InviteResult = { ok: boolean; error?: string; link?: string; emailed?: boolean };

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function requireManager() {
  const ctx = await requireApprovedMember("/painel/equipe");
  if (ctx.membership.role !== "gestor") throw new Error("Apenas o gestor gerencia a equipe.");
  return ctx;
}

export async function inviteMember(email: string, role: "corretor" | "gestor"): Promise<InviteResult> {
  const { membership } = await requireManager();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!z.enum(["corretor", "gestor"]).safeParse(role).success) return { ok: false, error: "Papel inválido." };
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_agency_invite", {
    p_agency: membership.agencyId,
    p_email: parsed.data,
    p_role: role,
  });
  if (error || !token) {
    return { ok: false, error: error?.code === "23505" ? error.message : "Não conseguimos criar o convite. Tente de novo." };
  }
  const link = `${await origin()}/painel/convite/${token}`;
  const { sent } = await sendEmail(
    parsed.data,
    `Convite para a equipe da ${membership.agencyName} na Konexya`,
    `<div style="font-family:Arial,sans-serif;color:#151516;max-width:480px">
      <p>${escapeHtml(membership.name)} convidou você para a equipe da <b>${escapeHtml(membership.agencyName)}</b> no painel da Konexya.</p>
      <p><a href="${link}" style="display:inline-block;background:#0b0b0c;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Aceitar convite</a></p>
      <p style="color:#5f5f5c;font-size:13px">O convite vale por 7 dias.</p></div>`,
  );
  revalidatePath("/painel/equipe");
  return { ok: true, link, emailed: sent };
}

export async function cancelInvite(inviteId: string) {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("agency_invites").delete().eq("id", inviteId);
  revalidatePath("/painel/equipe");
}

const memberUpdate = z
  .object({
    in_rotation: z.boolean(),
    active: z.boolean(),
    role: z.enum(["gestor", "corretor"]),
  })
  .partial();

export async function updateMember(userId: string, changes: z.infer<typeof memberUpdate>) {
  const { membership } = await requireManager();
  const parsed = memberUpdate.safeParse(changes);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase
    .from("agency_members")
    .update(parsed.data)
    .eq("agency_id", membership.agencyId)
    .eq("user_id", userId)
    .select("user_id");
  revalidatePath("/painel/equipe");
  return { ok: Boolean(data?.length) };
}
