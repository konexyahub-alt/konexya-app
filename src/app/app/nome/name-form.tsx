"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/ui";
import { saveName, type FormState } from "../actions";

export function NameForm({ next, initial }: { next: string; initial: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveName, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <TextField label="Nome" name="nome" defaultValue={initial} autoComplete="given-name" autoFocus error={state.error} />
      <div className="mt-auto">
        <Button type="submit" fullWidth loading={pending}>
          Começar a conversa
        </Button>
      </div>
    </form>
  );
}
