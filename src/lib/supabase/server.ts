import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Cliente Supabase do servidor, com a sessão do usuário (cookies). O acesso é limitado pelo RLS. */
export async function createClient() {
  // Sessão é sempre dado da requisição: nunca entra na pré-renderização.
  await connection();
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component: não dá para gravar cookies aqui.
          // A renovação da sessão fica a cargo do proxy (etapa 1).
        }
      },
    },
  });
}
