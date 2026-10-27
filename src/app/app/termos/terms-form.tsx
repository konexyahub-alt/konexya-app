"use client";

import { useFormAction } from "@/lib/use-form-action";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { acceptTerms, type FormState } from "../actions";

export function TermsForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useFormAction<FormState>(acceptTerms, {});
  const [checked, setChecked] = useState(false);
  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex min-h-touch items-start gap-3 text-[13px] text-muted">
        <input
          type="checkbox"
          name="aceite"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-[22px] flex-none accent-black"
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos-de-uso" target="_blank" className="font-semibold text-ink underline underline-offset-2">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold text-ink underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-bad">
          <Icon name="alert" size="sm" /> {state.error}
        </p>
      ) : null}
      <div className="mt-auto">
        <Button type="submit" fullWidth disabled={!checked} loading={pending}>
          Continuar
        </Button>
      </div>
    </form>
  );
}
