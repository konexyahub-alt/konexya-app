import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SLOGAN, Wordmark, buttonClasses } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";

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
      <div className="flex flex-col gap-3.5">
        <Link href="/app/entrar?modo=criar" className={buttonClasses({ fullWidth: true })}>
          Começar
        </Link>
        <Link
          href="/app/entrar"
          className="min-h-touch content-center text-center text-sm font-semibold underline underline-offset-4"
        >
          Já tenho conta
        </Link>
      </div>
    </main>
  );
}

async function RedirectIfLoggedIn() {
  if (await getSessionUser()) redirect("/app");
  return null;
}
