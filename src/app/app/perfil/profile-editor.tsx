"use client";

import { useState, useTransition } from "react";
import { Button, Chip, Icon, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  KIND_LABELS,
  LIFESTYLE_LABELS,
  PETS_LABELS_CLIENT,
  PRIORITY_LABELS,
  TIMELINE_LABELS,
  budgetLabel,
  objectiveLabel,
  shortBRL,
  type Priority,
  type Profile,
  type ProfileUpdate,
} from "@/lib/profile";
import { deleteAccount, revokeShare, updateProfile } from "../actions";

type Field = {
  key: string;
  label: string;
  value: (p: Profile) => string | null;
  /** Editor: devolve o rascunho da mudança. */
  edit: (p: Profile, draft: ProfileUpdate, set: (u: ProfileUpdate) => void, ctx: { neighborhoods: string[] }) => React.ReactNode;
};

function Options<T extends string | number | boolean | null>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.label} selected={value === o.value} onClick={() => onChange(o.value)} className="min-h-touch px-3.5 text-[12.5px]">
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

const pick = <K extends keyof Profile>(p: Profile, d: ProfileUpdate, k: K) =>
  (k in d ? (d as Profile)[k] : p[k]) as Profile[K];

const FIELDS: Field[] = [
  {
    key: "prioridade",
    label: "Prioridade",
    value: (p) => (p.priorities.length ? p.priorities.map((x) => PRIORITY_LABELS[x]).join(", ") : null),
    edit: (p, d, set) => {
      const current = pick(p, d, "priorities");
      return (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((x) => (
            <Chip
              key={x}
              selected={current.includes(x)}
              className="min-h-touch px-3.5 text-[12.5px]"
              onClick={() => set({ priorities: current.includes(x) ? current.filter((y) => y !== x) : [...current, x] })}
            >
              {PRIORITY_LABELS[x]}
            </Chip>
          ))}
        </div>
      );
    },
  },
  {
    key: "trabalho",
    label: "Trabalho",
    value: (p) => (p.works_from_home ? "Trabalha de casa" : p.work_neighborhood),
    edit: (p, d, set, ctx) => {
      const home = pick(p, d, "works_from_home") === true;
      return (
        <div className="grid gap-2.5">
          <input
            list="bairros"
            aria-label="Bairro onde você trabalha"
            placeholder="Bairro onde você trabalha"
            disabled={home}
            defaultValue={p.work_neighborhood ?? ""}
            onChange={(e) => set({ work_neighborhood: e.target.value, works_from_home: false })}
            className="h-12 rounded-field border border-line-2 bg-white px-3.5 text-sm disabled:opacity-40"
          />
          <datalist id="bairros">
            {ctx.neighborhoods.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Chip selected={home} className="min-h-touch w-fit px-3.5 text-[12.5px]" onClick={() => set({ works_from_home: !home, work_neighborhood: home ? p.work_neighborhood : null })}>
            Trabalho de casa
          </Chip>
          <p className="text-[11.5px] text-muted-2">A imobiliária vê só o bairro, nunca o endereço.</p>
        </div>
      );
    },
  },
  {
    key: "trajeto",
    label: "Trajeto",
    value: (p) => (p.works_from_home ? "Não se aplica" : p.commute_max_min ? `Até ${p.commute_max_min} min no pico` : null),
    edit: (p, d, set) => (
      <Options
        options={[15, 20, 30, 45, 60].map((m) => ({ label: `Até ${m} min`, value: m }))}
        value={pick(p, d, "commute_max_min") ?? undefined}
        onChange={(v) => set({ commute_max_min: v })}
      />
    ),
  },
  {
    key: "estilo",
    label: "Estilo de vida",
    value: (p) => (p.lifestyle ? LIFESTYLE_LABELS[p.lifestyle] : null),
    edit: (p, d, set) => (
      <Options
        options={(["tranquilidade", "meio_termo", "movimento"] as const).map((x) => ({ label: LIFESTYLE_LABELS[x], value: x }))}
        value={pick(p, d, "lifestyle") ?? undefined}
        onChange={(v) => set({ lifestyle: v })}
      />
    ),
  },
  {
    key: "familia",
    label: "Filhos e pets",
    value: (p) =>
      p.has_children === null && p.pets === null
        ? null
        : [p.has_children === null ? null : p.has_children ? "Com filhos" : "Sem filhos", p.pets ? PETS_LABELS_CLIENT[p.pets] : null]
            .filter(Boolean)
            .join(" · "),
    edit: (p, d, set) => (
      <div className="grid gap-3">
        <Options
          options={[
            { label: "Com filhos", value: true },
            { label: "Sem filhos", value: false },
          ]}
          value={pick(p, d, "has_children") ?? undefined}
          onChange={(v) => set({ has_children: v })}
        />
        <Options
          options={(["nenhum", "pequeno", "grande"] as const).map((x) => ({ label: PETS_LABELS_CLIENT[x], value: x }))}
          value={pick(p, d, "pets") ?? undefined}
          onChange={(v) => set({ pets: v })}
        />
      </div>
    ),
  },
  {
    key: "objetivo",
    label: "Objetivo",
    value: (p) => objectiveLabel(p),
    edit: (p, d, set) => {
      const cur = `${pick(p, d, "purpose")}:${pick(p, d, "goal")}`;
      return (
        <Options
          options={[
            { label: "Comprar para morar", value: "comprar:morar" },
            { label: "Comprar para investir", value: "comprar:investir" },
            { label: "Morar e investir", value: "comprar:ambos" },
            { label: "Alugar para morar", value: "alugar:morar" },
          ]}
          value={cur}
          onChange={(v) => {
            const [purpose, goal] = v.split(":") as [Profile["purpose"], Profile["goal"]];
            set({ purpose, goal });
          }}
        />
      );
    },
  },
  {
    key: "prazo",
    label: "Prazo",
    value: (p) => (p.timeline ? TIMELINE_LABELS[p.timeline] : null),
    edit: (p, d, set) => (
      <Options
        options={(["ate_3_meses", "ate_6_meses", "pesquisando"] as const).map((x) => ({ label: TIMELINE_LABELS[x], value: x }))}
        value={pick(p, d, "timeline") ?? undefined}
        onChange={(v) => set({ timeline: v })}
      />
    ),
  },
  {
    key: "orcamento",
    label: "Orçamento",
    value: (p) => budgetLabel(p),
    edit: (p, d, set) => {
      const rent = pick(p, d, "purpose") === "alugar";
      const max = pick(p, d, "budget_max");
      const min = pick(p, d, "budget_min");
      const presets = rent ? [2_000, 3_500, 5_000, 8_000] : [500_000, 800_000, 1_200_000, 2_000_000];
      return (
        <div className="grid gap-3">
          <Options
            options={presets.map((v) => ({ label: `Até ${shortBRL(v)}`, value: v }))}
            value={min === null ? (max ?? undefined) : undefined}
            onChange={(v) => set({ budget_max: v, budget_min: null })}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[11.5px] text-muted">
              De (R$)
              <input
                inputMode="numeric"
                defaultValue={min ?? ""}
                onChange={(e) => set({ budget_min: numberOrNull(e.target.value) })}
                className="h-12 rounded-field border border-line-2 bg-white px-3 text-sm text-ink"
              />
            </label>
            <label className="grid gap-1 text-[11.5px] text-muted">
              Até (R$)
              <input
                inputMode="numeric"
                defaultValue={max ?? ""}
                onChange={(e) => set({ budget_max: numberOrNull(e.target.value) })}
                className="h-12 rounded-field border border-line-2 bg-white px-3 text-sm text-ink"
              />
            </label>
          </div>
          <p className="text-[11.5px] text-muted-2">{rent ? "Valor do aluguel por mês." : "Valor total do imóvel."}</p>
        </div>
      );
    },
  },
  {
    key: "tipo",
    label: "Tipo",
    value: (p) => (p.property_kind ? KIND_LABELS[p.property_kind] : null),
    edit: (p, d, set) => (
      <Options
        options={(["apartamento", "casa", "tanto_faz"] as const).map((x) => ({ label: KIND_LABELS[x], value: x }))}
        value={pick(p, d, "property_kind") ?? undefined}
        onChange={(v) => set({ property_kind: v })}
      />
    ),
  },
  {
    key: "quartos",
    label: "Quartos e vagas",
    value: (p) =>
      p.bedrooms_min === null && p.parking_min === null
        ? null
        : [p.bedrooms_min ? `${p.bedrooms_min}+ quartos` : null, p.parking_min ? `${p.parking_min}+ vagas` : null]
            .filter(Boolean)
            .join(" · ") || "Tanto faz",
    edit: (p, d, set) => (
      <div className="grid gap-3">
        <p className="text-[11.5px] text-muted">Quartos (mínimo)</p>
        <Options
          options={[{ label: "Tanto faz", value: null }, ...[1, 2, 3, 4].map((n) => ({ label: `${n}+`, value: n as number | null }))]}
          value={pick(p, d, "bedrooms_min")}
          onChange={(v) => set({ bedrooms_min: v })}
        />
        <p className="text-[11.5px] text-muted">Vagas (mínimo)</p>
        <Options
          options={[{ label: "Tanto faz", value: null }, ...[1, 2, 3].map((n) => ({ label: `${n}+`, value: n as number | null }))]}
          value={pick(p, d, "parking_min")}
          onChange={(v) => set({ parking_min: v })}
        />
      </div>
    ),
  },
  {
    key: "bairros",
    label: "Bairros de interesse",
    value: (p) => (p.neighborhoods.length ? p.neighborhoods.join(", ") : null),
    edit: (p, d, set, ctx) => <NeighborhoodsEditor value={pick(p, d, "neighborhoods")} onChange={(v) => set({ neighborhoods: v })} options={ctx.neighborhoods} />,
  },
];

function numberOrNull(v: string): number | null {
  const n = Number(v.replace(/\D/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
}

function NeighborhoodsEditor({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t.length >= 2 && !value.includes(t)) onChange([...value, t]);
    setText("");
  };
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap gap-2">
        {value.map((n) => (
          <Chip key={n} selected onClick={() => onChange(value.filter((x) => x !== n))} aria-label={`Tirar ${n}`} className="min-h-touch">
            {n} <Icon name="x" size="sm" />
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          list="bairros-interesse"
          aria-label="Adicionar bairro"
          placeholder="Adicionar bairro"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-12 min-w-0 flex-1 rounded-field border border-line-2 bg-white px-3.5 text-sm"
        />
        <Button variant="secondary" size="sm" onClick={add}>
          Adicionar
        </Button>
      </div>
      <datalist id="bairros-interesse">
        {options.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  );
}

export function ProfileEditor({
  profile,
  initialEdit,
  neighborhoods,
}: {
  profile: Profile;
  initialEdit: string | null;
  neighborhoods: string[];
}) {
  const [editing, setEditing] = useState<string | null>(
    FIELDS.some((f) => f.key === initialEdit) ? initialEdit : null,
  );
  const [draft, setDraft] = useState<ProfileUpdate>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { showToast } = useToast();

  const open = (key: string | null) => {
    setEditing(key);
    setDraft({});
    setError(null);
  };

  const save = () =>
    start(async () => {
      setError(null);
      if (!Object.keys(draft).length) return open(null);
      const r = await updateProfile(draft);
      if (r.error) return setError(r.error);
      showToast(r.recalculated ? "Recomendações atualizadas." : "Salvo.");
      open(null);
    });

  return (
    <section className="overflow-hidden rounded-[20px] bg-white shadow-soft" aria-label="Itens do perfil">
      {FIELDS.map((f, i) => {
        const value = f.value(profile);
        const isOpen = editing === f.key;
        return (
          <div key={f.key} className={cn("px-[18px] py-3.5", i > 0 && "border-t border-[#f0f0ee]", isOpen && "bg-[#fafaf8]")}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11.5px] text-muted-2">{f.label}</p>
                {!isOpen ? (
                  <p className={cn("text-[14.5px] font-semibold", !value && "font-normal text-muted-2")}>
                    {value ?? "Ainda não informado"}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => open(isOpen ? null : f.key)}
                className="min-h-touch flex-none px-1 text-[12.5px] font-semibold underline underline-offset-4"
              >
                {isOpen ? "Cancelar" : "Editar"}
              </button>
            </div>
            {isOpen ? (
              <div className="grid gap-3 pb-1 pt-2">
                {f.edit(profile, draft, (u) => setDraft((d) => ({ ...d, ...u })), { neighborhoods })}
                {error ? (
                  <p role="alert" className="text-[12.5px] font-semibold text-bad">
                    {error}
                  </p>
                ) : null}
                <Button fullWidth onClick={save} loading={pending}>
                  Salvar
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

export function AccountSection({
  email,
  shares,
  signOut,
}: {
  email: string;
  shares: { agencyId: string; agencyName: string; sharedAt: string | null; revoked: boolean }[];
  signOut: (form: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-2 px-1 pt-4">
        <p className="trk">Conta e privacidade</p>
        <p className="text-[11.5px] text-muted">{email}</p>
      </div>

      <section className="grid gap-2" aria-label="Compartilhado com">
        <p className="px-1 text-[11.5px] font-semibold text-muted">Compartilhado com</p>
        {shares.length ? (
          shares.map((s) => (
            <div key={s.agencyId} className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">{s.agencyName}</p>
                <p className="text-[11.5px] text-muted-2">
                  {s.revoked
                    ? "Compartilhamento revogado"
                    : s.sharedAt
                      ? `Autorizado em ${new Date(s.sharedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).replace(":", "h").replace(", ", ", ")}`
                      : "Autorizado"}
                </p>
              </div>
              {!s.revoked ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await revokeShare(s.agencyId);
                      setNotice(
                        r.error ??
                          `Compartilhamento revogado. A ${s.agencyName} já recebeu os dados até agora; novos dados não serão enviados.`,
                      );
                    })
                  }
                  className="min-h-touch px-1 text-[12.5px] font-semibold text-bad underline underline-offset-4"
                >
                  Revogar
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-[20px] border border-dashed border-line-2 p-4 text-[12.5px] text-muted">
            Você ainda não compartilhou seu perfil com nenhuma imobiliária.
          </p>
        )}
        {notice ? (
          <p role="status" className="flex gap-2 rounded-[18px] bg-black p-4 text-[13px] text-white">
            <Icon name="check" size="sm" className="mt-0.5" />
            {notice}
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[20px] bg-white shadow-soft" aria-label="Seus dados">
        <a href="/app/perfil/dados" className="flex min-h-[52px] items-center justify-between px-[18px] text-[14.5px] font-semibold">
          Baixar meus dados <Icon name="arrow" size="sm" />
        </a>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex min-h-[52px] w-full items-center justify-between border-t border-[#f0f0ee] px-[18px] text-left text-[14.5px] font-semibold text-bad"
        >
          Excluir minha conta <Icon name="arrow" size="sm" />
        </button>
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-[52px] w-full items-center justify-between border-t border-[#f0f0ee] px-[18px] text-left text-[14.5px] font-semibold"
          >
            Sair <Icon name="arrow" size="sm" />
          </button>
        </form>
      </section>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="excluir-titulo" className="w-full max-w-[430px] rounded-t-[28px] bg-white p-6">
            <h2 id="excluir-titulo" className="text-xl font-bold">
              Excluir sua conta?
            </h2>
            <p className="mt-2 text-[13px] text-muted">
              Seu perfil, sua conversa e seus imóveis salvos serão apagados. Os compartilhamentos ativos são revogados. As
              imobiliárias guardam só o que já tinham recebido com a sua autorização. Não dá para desfazer.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-[12.5px] font-semibold text-bad">
                {error}
              </p>
            ) : null}
            <Button
              fullWidth
              className="mt-5 border-bad bg-bad hover:bg-bad"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteAccount();
                  if (r?.error) setError(r.error);
                })
              }
            >
              Excluir minha conta
            </Button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="mt-1 min-h-touch w-full text-sm font-semibold underline underline-offset-4">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
