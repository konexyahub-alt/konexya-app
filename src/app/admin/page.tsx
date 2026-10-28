import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Chip, EmptyState, Skeleton, YMark } from "@/components/ui";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { formatCnpj } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Admin · Konexya" };

const TABS = [
  ["pendente", "Pendentes"],
  ["aprovada", "Aprovadas"],
  ["recusada", "Recusadas"],
  ["suspensa", "Suspensas"],
] as const;

/** Admin Konexya: aprovar imobiliárias. Uso por imobiliária e logs da IA entram nas próximas etapas. */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <YMark className="h-7" />
        <span className="text-[13px] font-bold">Konexya · Admin interno</span>
      </div>
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Imobiliárias</h1>
        <p className="text-[13px] text-muted">Confira CNPJ e CRECI antes de aprovar.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function List({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await requireUser("/painel/entrar", "/admin");
  if (!(await isPlatformAdmin())) notFound();
  const params = await searchParams;
  const tab = TABS.find(([k]) => k === params.status)?.[0] ?? "pendente";
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("agencies")
    .select("id, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, status, created_at")
    .order("created_at", { ascending: true });
  const rows = (all ?? []).filter((a) => a.status === tab);
  const count = (s: string) => (all ?? []).filter((a) => a.status === s).length;
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" });
  return (
    <>
      <nav className="flex flex-wrap gap-2" aria-label="Situação">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?status=${key}`}>
            <Chip selected={tab === key} tabIndex={-1}>
              {label} · {count(key)}
            </Chip>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="Nenhuma imobiliária nesta lista." />
      ) : (
        <ul className="grid gap-3">
          {rows.map((a) => (
            <li key={a.id} className="grid gap-3 rounded-card border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid gap-0.5 text-[13px]">
                <b className="text-[15px]">{a.legal_name}</b>
                <span className="num">
                  CNPJ {formatCnpj(a.cnpj)} · CRECI {a.creci}
                </span>
                <span className="text-muted">
                  {a.manager_name} · {a.manager_email} · WhatsApp {a.whatsapp}
                </span>
                <span className="text-xs text-muted-2">Enviado em {date.format(new Date(a.created_at))}</span>
              </div>
              <ReviewButtons agencyId={a.id} status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
