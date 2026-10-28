import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { RETURNING_COOKIE, RETURNING_MAX_AGE } from "@/lib/returning";
import { createClient } from "@/lib/supabase/server";

/** Retorno do login com Google: troca o código pela sessão e segue para a tela pedida. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/app");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(new URL(next, url.origin));
      res.cookies.set(RETURNING_COOKIE, "1", { path: "/", maxAge: RETURNING_MAX_AGE, sameSite: "lax", secure: true });
      return res;
    }
  }
  const back = next.startsWith("/painel") ? "/painel/entrar" : "/app/entrar";
  return NextResponse.redirect(new URL(`${back}?erro=google`, url.origin));
}
