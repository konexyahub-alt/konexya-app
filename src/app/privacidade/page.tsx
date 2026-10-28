import Link from "next/link";
import { Wordmark } from "@/components/ui";

export const metadata = { title: "Política de Privacidade · Konexya" };

export default function Page() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
      <Link href="/app" aria-label="Konexya">
        <Wordmark />
      </Link>
      <h1 className="text-2xl font-bold">Política de Privacidade</h1>
      <p className="text-muted">
        O texto completo está sendo preparado com a assessoria jurídica da Konexya e será publicado aqui antes do
        início do piloto.
      </p>
    </main>
  );
}
