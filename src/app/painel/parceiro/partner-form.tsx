"use client";

import { useFormAction } from "@/lib/use-form-action";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon, TextField } from "@/components/ui";
import { formatCnpj } from "@/lib/validation";
import { registerAgency, type FormState } from "../actions";

export function PartnerForm({ email }: { email: string }) {
  const { state, pending, onSubmit } = useFormAction<FormState>(registerAgency, {});
  const [cnpj, setCnpj] = useState("");
  const [accepted, setAccepted] = useState(false);
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Razão social" name="legalName" error={fe.legalName} className="sm:col-span-2" />
        <TextField
          label="CNPJ"
          name="cnpj"
          inputMode="numeric"
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
          placeholder="00.000.000/0000-00"
          error={fe.cnpj}
        />
        <TextField label="CRECI jurídico" name="creci" error={fe.creci} />
        <TextField label="Nome do gestor" name="managerName" autoComplete="name" error={fe.managerName} />
        <TextField label="WhatsApp" name="whatsapp" type="tel" inputMode="tel" placeholder="(85) 90000-0000" error={fe.whatsapp} />
        <TextField label="E-mail do gestor" value={email} readOnly hint="O e-mail confirmado com o código." className="sm:col-span-2" />
      </div>
      <label className="flex min-h-touch items-start gap-3 text-[13px] text-muted">
        <input
          type="checkbox"
          name="aceite"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 size-[22px] flex-none accent-black"
        />
        <span>
          Li e aceito o termo de parceria e a{" "}
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
      <Button type="submit" fullWidth disabled={!accepted} loading={pending}>
        Enviar cadastro
      </Button>
    </form>
  );
}
