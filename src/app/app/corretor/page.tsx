import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TabBar } from "@/components/client/tab-bar";
import { Skeleton, YMark, buttonClasses } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** C-11 · Corretor: lista de conversas (uma por imobiliária) ou o estado vazio. */
export default function BrokerTab() {
  return (
    <>
      <main className="flex flex-1 flex-col px-5 pb-6 pt-[max(18px,env(safe-area-inset-top))]">
        <p className="trk mt-4">Corretor</p>
        <h1 className="mt-2 text-[30px] font-light tracking-tight">Suas conversas</h1>
        <Suspense fallback={<Skeleton className="mt-6 h-20 rounded-[20px]" />}>
          <Conversations />
        </Suspense>
      </main>
      <TabBar active="Corretor" />
    </>
  );
}

async function Conversations() {
  await requireReadyClient("/app/corretor");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  const list = data ?? [];
  if (list.length === 1) redirect(`/app/corretor/${list[0].lead_id}`);

  if (!list.length) {
    return (
      <div className="mt-10 grid justify-items-center gap-4 text-center">
        <span className="grid size-24 place-items-center rounded-full bg-white shadow-card">
          <YMark className="h-10" />
        </span>
        <p className="text-xl font-light">
          Fale com um corretor <b className="font-bold">quando quiser.</b>
        </p>
        <p className="max-w-[320px] text-[12.5px] text-muted">
          Seu perfil só vai para a imobiliária se você autorizar. Abra um imóvel e toque em Falar com o corretor.
        </p>
        <Link href="/app" className={buttonClasses({ variant: "secondary" })}>
          Ver minhas recomendações
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid gap-3">
      {list.map((c) => (
        <li key={c.lead_id}>
          <Link
            href={`/app/corretor/${c.lead_id}`}
            className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-card outline outline-1 outline-transparent hover:outline-black"
          >
            <span className="grid size-[42px] flex-none place-items-center rounded-full bg-black text-[11.5px] font-bold text-white">
              {initials(c.agency_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-bold">{c.agency_name}</span>
              <span className="block truncate text-[11.5px] text-muted">
                {c.revoked ? "Compartilhamento revogado" : c.broker_name ? `Corretor(a) ${c.broker_name}` : "Equipe da imobiliária"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
