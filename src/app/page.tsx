import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { appEnv } from "@/lib/env";

export default function Home() {
  const showReference = appEnv() !== "producao";
  return (
    <main className="mx-auto grid min-h-dvh max-w-[430px] content-center justify-items-center gap-6 px-4 text-center">
      <Wordmark className="h-8" />
      <p className="text-muted">Em construção.</p>
      {showReference ? (
        <Link href="/referencia" className="text-[13px] font-semibold underline underline-offset-4">
          Componentes base
        </Link>
      ) : null}
    </main>
  );
}
