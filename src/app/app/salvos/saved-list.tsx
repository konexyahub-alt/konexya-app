"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Chip, EmptyState, Icon, ScoreRing, Tag, buttonClasses, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ScoreBand } from "@/lib/score-band";
import { toggleFavorite } from "../actions";

export type SavedItem = {
  id: string;
  title: string;
  line: string;
  photoUrl: string | null;
  available: boolean;
  score: number | null;
  budget: { band: ScoreBand; text: string } | null;
};

const MAX_COMPARE = 3;

export function SavedList({ items, startComparing }: { items: SavedItem[]; startComparing: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  const available = items.filter((i) => i.available);
  // Ao entrar em "Comparar", já vêm marcados os de nota mais alta (até 3); o cliente troca se quiser.
  const preselect = () =>
    [...available]
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, MAX_COMPARE)
      .map((i) => i.id);
  const [comparing, setComparing] = useState(startComparing && available.length >= 2);
  const [picked, setPicked] = useState<string[]>(() => (startComparing ? preselect() : []));

  if (!items.length) {
    return (
      <EmptyState
        title="Você ainda não salvou imóveis."
        description="Toque no coração de um imóvel para guardar aqui e comparar depois."
        action={
          <Link href="/app" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Ver recomendações
          </Link>
        }
      />
    );
  }

  const remove = (id: string) =>
    start(async () => {
      const r = await toggleFavorite(id, false);
      if (r.error) showToast(r.error);
      else {
        showToast("Tirado dos salvos.");
        setPicked((p) => p.filter((x) => x !== id));
        router.refresh();
      }
    });
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_COMPARE ? p : [...p, id]));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Chip selected={!comparing} onClick={() => setComparing(false)}>
          Todos {items.length}
        </Chip>
        <Chip
          selected={comparing}
          disabled={available.length < 2}
          onClick={() => {
            if (!comparing && !picked.length) setPicked(preselect());
            setComparing(true);
          }}
        >
          Comparar{comparing ? ` (${picked.length})` : ""}
        </Chip>
      </div>
      {comparing ? (
        <p className="text-[12.5px] text-muted">Escolha 2 ou 3 imóveis para comparar.</p>
      ) : available.length < 2 ? (
        <p className="text-[12.5px] text-muted">Salve pelo menos 2 imóveis disponíveis para comparar.</p>
      ) : null}

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {items.map((i) => {
          const on = picked.includes(i.id);
          const body = (
            <>
              <span className="relative size-[72px] flex-none overflow-hidden rounded-[14px] bg-paper-2">
                {i.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.photoUrl} alt="" className={cn("size-full object-cover", !i.available && "grayscale")} />
                ) : (
                  <Icon name="home" className="absolute inset-0 m-auto text-muted-2" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[14px] font-bold", !i.available && "text-muted")}>{i.title}</span>
                <span className="block truncate text-[12.5px] text-muted">{i.line}</span>
                {!i.available ? (
                  <Tag className="mt-1.5">Não está mais disponível</Tag>
                ) : i.budget ? (
                  <span className={cn("mt-1 flex items-center gap-1 text-[12px]", i.budget.band === "ok" ? "text-ok" : i.budget.band === "warn" ? "text-warn" : "text-bad")}>
                    <Icon name={i.budget.band === "ok" ? "check" : "alert"} size="sm" />
                    <span className="truncate">{i.budget.text}</span>
                  </span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={i.id} className={cn("flex items-center gap-3 rounded-[20px] bg-white p-3", !i.available && "bg-white/60", comparing && on && "ring-2 ring-black")}>
              {comparing && i.available ? (
                <button type="button" aria-pressed={on} onClick={() => toggle(i.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {body}
                  <span aria-hidden className={cn("grid size-6 flex-none place-items-center rounded-full border-[1.5px]", on ? "border-black bg-black text-white" : "border-line-2")}>
                    {on ? <Icon name="check" size="sm" /> : null}
                  </span>
                </button>
              ) : i.available ? (
                <>
                  <Link href={`/app/imoveis/${i.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {body}
                  </Link>
                  <span className="grid flex-none justify-items-center gap-1.5">
                    {i.score !== null ? <ScoreRing score={i.score} size={44} /> : null}
                    <button type="button" aria-label={`Tirar ${i.title} dos salvos`} disabled={pending} onClick={() => remove(i.id)} className="grid size-8 place-items-center">
                      <Icon name="heartF" size="sm" />
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
                  <button type="button" disabled={pending} onClick={() => remove(i.id)} className="min-h-touch flex-none px-1 text-[13px] font-semibold underline underline-offset-4">
                    Remover
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {comparing ? (
        <div className="sticky bottom-[calc(64px+max(10px,env(safe-area-inset-bottom)))] z-20 bg-paper py-2">
          <Button
            fullWidth
            disabled={picked.length < 2}
            onClick={() => router.push(`/app/salvos/comparar?ids=${picked.join(",")}`)}
          >
            {picked.length < 2 ? "Escolha pelo menos 2" : `Comparar ${picked.length} imóveis`}
          </Button>
        </div>
      ) : null}
    </>
  );
}
