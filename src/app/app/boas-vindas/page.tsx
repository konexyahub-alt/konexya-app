import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SLOGAN, Wordmark, buttonClasses } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { RETURNING_COOKIE } from "@/lib/returning";

/** C-01 · Boas-vindas. */
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col justify-between px-[22px] pb-7 pt-10">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <div />
      <div className="flex flex-col items-center gap-[22px] text-center">
        <Wordmark className="h-10" />
        <p className="text-[22px] font-light leading-snug">
          {SLOGAN.split(". ")[0]}.
          <br />
          {SLOGAN.split(". ")[1]}
        </p>
        <p className="max-w-[290px] text-[13px] text-muted">
          Conte como é a sua rotina e o que você procura. A IA encontra os imóveis que combinam com a sua vida.
        </p>
      </div>
      <Suspense fallback={<WelcomeActions returning={false} />}>
        <Actions />
      </Suspense>
    </main>
  );
}

async function RedirectIfLoggedIn() {
  if (await getSessionUser()) redirect("/app");
  return null;
}

/** Quem já entrou neste navegador vê "Entrar"; quem é novo, "Começar". O outro caminho fica sempre no link. */
async function Actions() {
  const returning = (await cookies()).get(RETURNING_COOKIE)?.value === "1";
  return <WelcomeActions returning={returning} />;
}

function WelcomeActions({ returning }: { returning: boolean }) {
  const create = { href: "/app/entrar?modo=criar", label: returning ? "Criar nova conta" : "Começar" };
  const login = { href: "/app/entrar", label: returning ? "Entrar" : "Já tenho conta" };
  const [main, link] = returning ? [login, create] : [create, login];
  return (
    <div className="flex flex-col gap-3.5">
      <Link href={main.href} className={buttonClasses({ fullWidth: true })}>
        {main.label}
      </Link>
      <Link href={link.href} className="min-h-touch content-center text-center text-sm font-semibold underline underline-offset-4">
        {link.label}
      </Link>
    </div>
  );
}
