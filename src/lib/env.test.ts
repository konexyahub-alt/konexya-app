import { afterEach, describe, expect, it, vi } from "vitest";
import { appEnv, isSupabaseConfigured, publicEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("env", () => {
  it("usa 'local' quando o ambiente não está definido ou é inválido", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    expect(appEnv()).toBe("local");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    expect(appEnv()).toBe("local");
  });

  it("lê o ambiente de teste e de produção", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "teste");
    expect(appEnv()).toBe("teste");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "producao");
    expect(appEnv()).toBe("producao");
  });

  it("exige URL e chave publicável do Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(() => publicEnv()).toThrow();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(isSupabaseConfigured()).toBe(true);
    expect(publicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe("https://exemplo.supabase.co");
  });
});
