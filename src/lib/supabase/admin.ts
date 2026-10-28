import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente com a chave secreta (ignora o RLS). Uso restrito ao servidor, para o que nem o cliente nem a
 * imobiliária podem escrever: mensagens da assistente e do sistema, resumo e sugestões da IA, registro da IA.
 * Devolve null se a chave não estiver configurada.
 */
export function createAdminClient() {
  const key = serverEnv().SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createSupabaseClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;
