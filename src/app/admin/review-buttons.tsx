"use client";

import { useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { reviewAgency } from "./actions";

export function ReviewButtons({ agencyId, status }: { agencyId: string; status: string }) {
  const [pending, start] = useTransition();
  const { showToast } = useToast();
  const run = (s: "aprovada" | "recusada" | "suspensa", msg: string) =>
    start(async () => {
      const r = await reviewAgency(agencyId, s);
      showToast(r.ok ? msg : (r.error ?? "Erro"));
    });
  if (status === "aprovada")
    return (
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run("suspensa", "Imobiliária suspensa")}>
        Suspender
      </Button>
    );
  return (
    <div className="flex items-center gap-3">
      {status === "pendente" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("recusada", "Cadastro recusado")}
          className="min-h-touch text-[13px] font-semibold text-muted underline underline-offset-4"
        >
          Recusar
        </button>
      ) : null}
      <Button variant="secondary" size="sm" loading={pending} onClick={() => run("aprovada", "Imobiliária aprovada")}>
        Aprovar
      </Button>
    </div>
  );
}
