import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildIcs } from "@/lib/visits";

/**
 * "Adicionar ao meu calendário": arquivo .ics de uma visita confirmada. Quem pode ver a visita (o cliente dela
 * ou a equipe do lead, pelo RLS) baixa o arquivo; o resto recebe 404. Sem sincronização (docs/DECISOES.md).
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await getSessionUser()) || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("visits")
    .select("id, lead_id, starts_at, duration_min, status, property_id")
    .eq("id", id)
    .maybeSingle();
  if (!v || v.status !== "confirmada") return new Response("Não encontrado", { status: 404 });

  const [{ data: p }, { data: lead }] = await Promise.all([
    v.property_id
      ? supabase.from("properties").select("title, street, street_number, neighborhood, city").eq("id", v.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // A equipe lê o lead (nome do cliente); o cliente não lê a tabela de leads e recebe o arquivo sem esse nome.
    supabase.from("leads").select("client_name").eq("id", v.lead_id).maybeSingle(),
  ]);
  const address = p ? [[p.street, p.street_number].filter(Boolean).join(", "), p.neighborhood, p.city ?? "Fortaleza"].filter(Boolean).join(", ") : null;
  const ics = buildIcs({
    id: v.id,
    startsAt: v.starts_at,
    durationMin: v.duration_min,
    title: `Visita: ${p?.title ?? "imóvel"}${p?.neighborhood ? `, ${p.neighborhood}` : ""}`,
    location: address,
    description: lead?.client_name ? `Cliente: ${lead.client_name}. Visita marcada pela Konexya.` : "Visita marcada pela Konexya.",
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="visita-konexya.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
