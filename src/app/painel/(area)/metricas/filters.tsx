"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const chip = (on: boolean) =>
  cn(
    "inline-flex min-h-touch items-center rounded-full border px-4 text-[13px] font-semibold sm:min-h-10",
    on ? "border-black bg-black text-white" : "border-line-2 bg-white hover:border-black",
  );

/** Período (7, 30, 90 dias ou datas) e corretor. Tudo fica no endereço, para os atalhos manterem o filtro. */
export function MetricsFilters({
  query,
  period,
  de,
  ate,
  broker,
  brokers,
}: {
  query: Record<string, string>;
  period: string;
  de?: string;
  ate?: string;
  broker: string;
  brokers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [custom, setCustom] = useState(period === "custom");
  const [from, setFrom] = useState(de ?? "");
  const [to, setTo] = useState(ate ?? "");
  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    return `/painel/metricas?${q}`;
  };
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {(["7", "30", "90"] as const).map((d) => (
          <Link key={d} href={href({ periodo: d, de: null, ate: null })} className={chip(period === d && !custom)} aria-current={period === d ? "true" : undefined}>
            {d} dias
          </Link>
        ))}
        <button type="button" className={chip(custom)} onClick={() => setCustom(true)}>
          Personalizado
        </button>
        {brokers.length > 1 ? (
          <select
            aria-label="Corretor"
            value={broker}
            onChange={(e) => router.push(href({ corretor: e.target.value || null }))}
            className="min-h-touch rounded-full border border-line-2 bg-white px-4 text-[13px] font-semibold sm:min-h-10"
          >
            <option value="">Todos os corretores</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {custom ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[12px] font-semibold">
            De
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-11 rounded-field border border-line-2 bg-white px-3 text-[13px] font-normal" />
          </label>
          <label className="grid gap-1 text-[12px] font-semibold">
            Até
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-11 rounded-field border border-line-2 bg-white px-3 text-[13px] font-normal" />
          </label>
          <Button size="sm" variant="secondary" disabled={!from || !to || from > to} onClick={() => router.push(href({ periodo: "custom", de: from, ate: to }))}>
            Aplicar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
