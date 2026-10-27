"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip, Icon } from "@/components/ui";
import { STATUS_LABELS, type PropertyStatus } from "@/lib/property";

/** Busca e filtros da lista de imóveis (ficam na URL). */
export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q.trim() || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status");
  const selo = params.get("selo");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-h-touch w-full max-w-[320px] items-center gap-2 rounded-full border-[1.5px] border-line-2 px-4 focus-within:border-black">
        <Icon name="search" size="sm" className="text-muted-2" />
        <span className="sr-only">Buscar</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, bairro ou código"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
        />
      </label>
      {(Object.keys(STATUS_LABELS) as PropertyStatus[]).map((s) => (
        <Chip key={s} selected={status === s} onClick={() => set("status", status === s ? null : s)}>
          {STATUS_LABELS[s]}
        </Chip>
      ))}
      <Chip selected={selo === "sim"} onClick={() => set("selo", selo === "sim" ? null : "sim")}>
        Com selo
      </Chip>
      <Chip selected={selo === "nao"} onClick={() => set("selo", selo === "nao" ? null : "nao")}>
        Sem selo
      </Chip>
    </div>
  );
}
