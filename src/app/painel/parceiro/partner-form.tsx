"use client";

import { useFormAction } from "@/lib/use-form-action";
import Link from "next/link";
import { useState } from "react";
import { Button, HelpTip, Icon, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCnpj } from "@/lib/validation";
import { registerAgency, registerAutonomous, type FormState } from "../actions";

type Kind = "imobiliaria" | "autonomo";

const KINDS: { key: Kind; title: string; text: string; help: string }[] = [
  {
    key: "imobiliaria",
    title: "Imobiliária",
    text: "Empresa com CNPJ e CRECI jurídico. Você vira o gestor e convida os corretores da equipe.",
    help: "Para empresas. Quem se cadastra é o gestor: aprova a conta, convida os corretores por e-mail, distribui os leads e configura a assistente virtual. Os corretores da equipe não fazem este cadastro: eles entram pelo convite.",
  },
  {
    key: "autonomo",
    title: "Corretor autônomo",
    text: "Você anuncia sozinho, com o seu CRECI de pessoa física, sem estar ligado a uma imobiliária.",
    help: "Para quem trabalha por conta própria. Você cadastra seus imóveis e atende seus leads, com a mesma assistente virtual. Não tem equipe. Se você é corretor de uma imobiliária, esta opção não é para você: peça o convite ao gestor dela.",
  },
];

/** P-01 · Cadastro de anunciante: escolha entre imobiliária e corretor autônomo, depois o formulário de cada um. */
export function PartnerForm({ email }: { email: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-[13px] font-semibold">Como você vai anunciar na Konexya?</legend>
        {KINDS.map((k) => (
          <div
            key={k.key}
            className={cn(
              "flex items-start gap-3 rounded-[18px] border-[1.5px] bg-white p-4 transition-colors",
              kind === k.key ? "border-black" : "border-line-2",
            )}
          >
            <button
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className="grid min-w-0 flex-1 gap-1 text-left"
            >
              <span className="flex items-center gap-2 text-[15px] font-bold">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 flex-none place-items-center rounded-full border-[1.5px]",
                    kind === k.key ? "border-black bg-black text-white" : "border-line-2",
                  )}
                >
                  {kind === k.key ? <Icon name="check" className="size-3" /> : null}
                </span>
                {k.title}
              </span>
              <span className="text-[12.5px] text-muted">{k.text}</span>
            </button>
            <HelpTip label={k.title}>{k.help}</HelpTip>
          </div>
        ))}
      </fieldset>

      <p className="flex gap-2 rounded-[14px] bg-paper-2 p-3 text-[12.5px] text-[#3d3d3b]">
        <Icon name="info" size="sm" className="mt-px" />
        <span>
          <b>Trabalha numa imobiliária que já usa a Konexya?</b> Não faça cadastro. Peça ao gestor dela o convite: o link de
          acesso chega no seu e-mail.
        </span>
      </p>

      {kind === "imobiliaria" ? <AgencyForm email={email} /> : null}
      {kind === "autonomo" ? <AutonomousForm email={email} /> : null}
    </div>
  );
}

function AgencyForm({ email }: { email: string }) {
  const { state, pending, onSubmit } = useFormAction<FormState>(registerAgency, {});
  const [cnpj, setCnpj] = useState("");
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4">
        <TextField label="Razão social" name="legalName" error={fe.legalName} />
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
        <TextField label="E-mail do gestor" value={email} readOnly hint="O e-mail confirmado com o código." />
      </div>
      <Terms state={state} pending={pending} />
    </form>
  );
}

function AutonomousForm({ email }: { email: string }) {
  const { state, pending, onSubmit } = useFormAction<FormState>(registerAutonomous, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4">
        <TextField
          label="Nome completo"
          name="name"
          autoComplete="name"
          error={fe.name}
          hint="Como aparece no seu CRECI. É o nome que os clientes veem nos anúncios."
         
        />
        <TextField label="CRECI (pessoa física)" name="creci" error={fe.creci} />
        <TextField label="WhatsApp" name="whatsapp" type="tel" inputMode="tel" placeholder="(85) 90000-0000" error={fe.whatsapp} />
        <TextField label="E-mail" value={email} readOnly hint="O e-mail confirmado com o código." />
      </div>
      <Terms state={state} pending={pending} />
    </form>
  );
}

function Terms({ state, pending }: { state: FormState; pending: boolean }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <>
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
    </>
  );
}
