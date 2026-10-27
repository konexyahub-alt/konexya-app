"use client";

import { useFormAction } from "@/lib/use-form-action";
import { Button, Icon, TextField } from "@/components/ui";
import { acceptInvite, type FormState } from "../../actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const { state, pending, onSubmit } = useFormAction<FormState>(acceptInvite, {});
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-[13px] text-muted">
        Entrando como <b className="text-ink">{email}</b>.
      </p>
      <TextField label="Seu nome" name="nome" autoComplete="name" error={state.fieldErrors?.nome} />
      <TextField label="CRECI (opcional)" name="creci" hint="Aparece nos anúncios em que você for o corretor responsável." />
      {state.error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-bad">
          <Icon name="alert" size="sm" /> {state.error}
        </p>
      ) : null}
      <Button type="submit" fullWidth loading={pending}>
        Entrar na equipe
      </Button>
    </form>
  );
}
