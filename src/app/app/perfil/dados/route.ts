import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** "Baixar meus dados" (regra 12): tudo o que a Konexya guarda sobre o cliente, em JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Entre na sua conta para baixar seus dados.", { status: 401 });
  const supabase = await createClient();
  const [profile, chat, consents, favorites, views, conversations] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profile_chat_messages").select("author, body, created_at").eq("user_id", user.id).order("id"),
    supabase.from("consents").select("kind, agency_id, document_version, granted_at, revoked_at").eq("user_id", user.id),
    supabase.from("favorites").select("property_id, created_at").eq("user_id", user.id),
    supabase.from("property_views").select("property_id, first_viewed_at, last_viewed_at").eq("user_id", user.id),
    supabase.rpc("my_conversations"),
  ]);
  const leadIds = (conversations.data ?? []).map((c) => c.lead_id);
  const messages = leadIds.length
    ? await supabase.from("lead_messages").select("lead_id, sender, body, created_at").in("lead_id", leadIds).order("id")
    : { data: [] };
  const body = {
    exportado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email },
    perfil: profile.data,
    conversa_com_a_konexya: chat.data,
    consentimentos: consents.data,
    imoveis_salvos: favorites.data,
    imoveis_vistos: views.data,
    conversas_com_imobiliarias: (conversations.data ?? []).map((c) => ({
      imobiliaria: c.agency_name,
      compartilhado_em: c.shared_at,
      revogado: c.revoked,
      mensagens: (messages.data ?? []).filter((m) => m.lead_id === c.lead_id).map((m) => ({ remetente: m.sender, texto: m.body, enviado_em: m.created_at })),
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="meus-dados-konexya.json"',
      "cache-control": "no-store",
    },
  });
}
