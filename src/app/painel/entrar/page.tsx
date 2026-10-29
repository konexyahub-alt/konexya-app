import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmailCodeLogin } from "@/components/auth/email-code-login";
import { BrandSplit } from "@/components/panel/brand-split";
import { getSessionUser, safeNext } from "@/lib/auth";

/** P-01 · Acesso da imobiliária (e-mail com código). */
export default function PanelLoginPage({ searchParams }: PageProps<"/painel/entrar">) {
  return (
    <BrandSplit
      headline={
        <>
          A IA atende, qualifica e organiza.
          <br />
          Você fecha o negócio.
        </>
      }
      footnote="Painel para imobiliárias e corretores"
    >
      <Suspense>
        <Login searchParams={searchParams} />
      </Suspense>
    </BrandSplit>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/painel/entrar">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null, "/painel");
  if (await getSessionUser()) redirect(next);
  const partner = next === "/painel/parceiro";
  const invite = next.startsWith("/painel/convite/");
  return (
    <EmailCodeLogin
      next={next}
      title={partner ? "Quero anunciar" : invite ? "Aceitar convite" : "Entrar no painel"}
      subtitle={
        partner
          ? "Primeiro, confirme o e-mail do gestor. Enviamos um código para ele."
          : invite
            ? "Confirme o e-mail que recebeu o convite. Enviamos um código para ele."
            : "Enviamos um código para o seu e-mail."
      }
      footer={
        partner || invite ? null : (
          <p className="text-center text-[13px] text-muted">
            Ainda não anuncia na Konexya?{" "}
            <Link href="/painel/parceiro" className="font-bold text-ink underline underline-offset-4">
              Quero anunciar
            </Link>
          </p>
        )
      }
    />
  );
}
