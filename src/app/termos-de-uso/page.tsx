import Link from "next/link";
import { Wordmark } from "@/components/ui";

export const metadata = { title: "Termos de Uso · Konexya" };

export default function Page() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
      <Link href="/app" aria-label="Konexya">
        <Wordmark />
      </Link>
      <h1 className="text-2xl font-bold">Termos de Uso</h1>
      <p className="text-muted">
        O texto completo está sendo preparado com a assessoria jurídica da Konexya e será publicado aqui antes do
        início do piloto.
      </p>
    </main>
  );
}
