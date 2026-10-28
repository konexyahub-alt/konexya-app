import { z } from "zod";

/**
 * Variáveis de ambiente. Nenhuma chave fica no código: tudo vem do ambiente
 * (Vercel em teste/produção, .env.local no desenvolvimento). Ver .env.example.
 */

export const APP_ENVS = ["local", "teste", "producao"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const publicSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVS).default("local"),
  // Remove a barra final: "https://x.supabase.co/" geraria "//auth/v1/..." nas chamadas.
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .trim()
    .transform((url) => url.replace(/\/+$/, "")),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
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

const serverSchema = z.object({
  // Chave secreta do Supabase (papel service_role). Só no servidor: grava o que a IA e o sistema escrevem
  // para o lead e o registro da IA. Nunca com prefixo NEXT_PUBLIC_.
  SUPABASE_SECRET_KEY: z.string().trim().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-opus-5-5"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/** Variáveis só do servidor. As ausentes desligam o recurso que depende delas, sem derrubar o app. */
export function serverEnv(): ServerEnv {
  return serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || undefined,
  });
}
