import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string };

/** Usuário da sessão atual (validado no servidor), ou null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: String(claims.email ?? "") };
});

/** Exige sessão; sem ela, manda para o login da área e volta para `next` depois. */
export async function requireUser(loginPath: string, next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath);
  return user;
}

export const TERMS_VERSION = "v1";

export type ClientState = { user: SessionUser; termsAccepted: boolean; name: string | null };

export const getClientState = cache(async (user: SessionUser): Promise<ClientState> => {
  const supabase = await createClient();
  const [consents, profile] = await Promise.all([
    supabase.from("consents").select("id").eq("kind", "termos").is("revoked_at", null).limit(1),
    supabase.from("client_profiles").select("name").maybeSingle(),
  ]);
  return {
    user,
    termsAccepted: (consents.data?.length ?? 0) > 0,
    name: profile.data?.name ?? null,
  };
});

/**
 * Primeiro acesso do cliente: termos e nome antes de qualquer tela do app (fluxo F1).
 * Devolve o estado quando o cliente já pode seguir.
 */
export async function requireReadyClient(next: string): Promise<ClientState> {
  // Quem chega ao início sem sessão vê a boas-vindas (C-01); links profundos vão direto ao login.
  const user = next === "/app" ? await requireUser("/app/boas-vindas") : await requireUser("/app/entrar", next);
  const state = await getClientState(user);
  const suffix = `?next=${encodeURIComponent(next)}`;
  if (!state.termsAccepted) redirect(`/app/termos${suffix}`);
  if (!state.name) redirect(`/app/nome${suffix}`);
  return state;
}

export type AgencyMembership = {
  agencyId: string;
  agencyName: string;
  status: "pendente" | "aprovada" | "recusada" | "suspensa";
  role: "gestor" | "corretor";
  name: string;
  /** Corretor autônomo: anunciante de uma pessoa só (sem equipe nem rodízio). */
  autonomous: boolean;
};

export const getMembership = cache(async (user: SessionUser): Promise<AgencyMembership | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agency_members")
    .select("agency_id, role, name, active, agencies(legal_name, status, kind)")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!data || !data.agencies) return null;
  const agency = data.agencies;
  return {
    agencyId: data.agency_id,
    agencyName: agency.legal_name,
    status: agency.status,
    role: data.role,
    name: data.name,
    autonomous: agency.kind === "autonomo",
  };
});

/** Painel: exige membro ativo de imobiliária aprovada. */
export async function requireApprovedMember(next: string) {
  const user = await requireUser("/painel/entrar", next);
  const membership = await getMembership(user);
  if (!membership || membership.status !== "aprovada") redirect("/painel");
  return { user, membership };
}

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
});

/** Caminho de retorno seguro: só caminhos internos. */
export function safeNext(next: string | undefined | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
