import { connection } from "next/server";
import { appEnv, isSupabaseConfigured, publicEnv } from "@/lib/env";

type SupabaseCheck =
  | { supabase: "ok" | "nao_configurado" }
  // "detalhe" é o código HTTP ou o tipo de falha de rede: ajuda a diagnosticar sem expor segredos.
  | { supabase: "indisponivel"; detalhe: string };

/** Verificação de saúde do deploy: ambiente e conexão com o Supabase. Não expõe segredos. */
export async function GET() {
  await connection();
  return Response.json({ ambiente: appEnv(), ...(await checkSupabase()) });
}

async function checkSupabase(): Promise<SupabaseCheck> {
  if (!isSupabaseConfigured()) return { supabase: "nao_configurado" };
  const env = publicEnv();
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return res.ok ? { supabase: "ok" } : { supabase: "indisponivel", detalhe: `http_${res.status}` };
  } catch (error) {
    const name = error instanceof Error ? error.name : "erro";
    return { supabase: "indisponivel", detalhe: name === "TimeoutError" ? "timeout" : "rede" };
  }
}
