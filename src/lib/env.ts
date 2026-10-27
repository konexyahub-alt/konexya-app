import { z } from "zod";

/**
 * Variáveis de ambiente. Nenhuma chave fica no código: tudo vem do ambiente
 * (Vercel em teste/produção, .env.local no desenvolvimento). Ver .env.example.
 */

export const APP_ENVS = ["local", "teste", "producao"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const publicSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVS).default("local"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;

/** Ambiente atual. Não exige o Supabase configurado. */
export function appEnv(): AppEnv {
  const parsed = z.enum(APP_ENVS).safeParse(process.env.NEXT_PUBLIC_APP_ENV);
  return parsed.success ? parsed.data : "local";
}

/**
 * Variáveis públicas validadas. Lança erro se faltarem.
 * As referências precisam ser literais (process.env.NEXT_PUBLIC_...) para o Next embuti-las no navegador.
 */
export function publicEnv(): PublicEnv {
  return publicSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function isSupabaseConfigured(): boolean {
  return publicSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}
