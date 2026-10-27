import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmailCodeLogin } from "@/components/auth/email-code-login";
import { getSessionUser, safeNext } from "@/lib/auth";
import { SLOGAN } from "@/components/ui";

/** C-02 e C-03 · Entrar com e-mail e código. */
export default function ClientLoginPage({ searchParams }: PageProps<"/app/entrar">) {
  return (
    <main className="flex flex-1 flex-col px-[22px] pb-7 pt-2">
      <Suspense>
        <Login searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/app/entrar">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null, "/app");
  if (await getSessionUser()) redirect(next);
  return (
    <EmailCodeLogin
      next={next}
      backHref="/app/boas-vindas"
      title="Entre com seu e-mail"
      subtitle="Enviamos um código de 6 dígitos. Sem senha para lembrar."
      googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "on"}
      footer={<p className="mt-auto pt-8 text-center text-xs text-muted-2">{SLOGAN}</p>}
    />
  );
}
