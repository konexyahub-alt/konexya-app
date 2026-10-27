import { connection } from "next/server";
import { appEnv, isSupabaseConfigured, publicEnv } from "@/lib/env";

type SupabaseStatus = "ok" | "nao_configurado" | "indisponivel";

/** Verificação de saúde do deploy: ambiente e conexão com o Supabase. Não expõe segredos. */
export async function GET() {
  await connection();
  return Response.json({ ambiente: appEnv(), supabase: await checkSupabase() });
}

async function checkSupabase(): Promise<SupabaseStatus> {
  if (!isSupabaseConfigured()) return "nao_configurado";
  const env = publicEnv();
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return res.ok ? "ok" : "indisponivel";
  } catch {
    return "indisponivel";
  }
}
