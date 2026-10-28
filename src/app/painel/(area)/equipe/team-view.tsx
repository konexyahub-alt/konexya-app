"use client";

import { useState, useTransition } from "react";
import { Button, Card, Chip, EmptyState, Icon, IconButton, Tag, TextField, useToast } from "@/components/ui";
import { cancelInvite, inviteMember, updateMember, type InviteResult } from "./actions";

type Member = {
  user_id: string;
  name: string;
  email: string;
  role: "gestor" | "corretor";
  creci: string | null;
  active: boolean;
  in_rotation: boolean;
};
type Invite = { id: string; email: string; role: "gestor" | "corretor"; expired: boolean };

export function TeamView({ me, members, invites }: { me: string; members: Member[]; invites: Invite[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [confirmOff, setConfirmOff] = useState<Member | null>(null);
  const { showToast } = useToast();

  const toggle = (m: Member, changes: Partial<Pick<Member, "in_rotation" | "active">>, msg: string) =>
    start(async () => {
      const r = await updateMember(m.user_id, changes);
      showToast(r.ok ? msg : "Não conseguimos salvar. Tente de novo.");
    });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Equipe</h1>
          <p className="text-[13px] text-muted">Quem atende os leads e quem está no rodízio.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Convidar corretor
        </Button>
      </div>

      <ul className="grid gap-3">
        {members.map((m) => (
          <li key={m.user_id}>
            <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid gap-0.5 text-[13px]">
                <b className="text-[15px]">
                  {m.name} {m.user_id === me ? <span className="font-normal text-muted">(você)</span> : null}
                </b>
                <span className="text-muted">
                  {m.email} · {m.role === "gestor" ? "Gestor" : "Corretor"}
                  {m.creci ? ` · CRECI ${m.creci}` : ""}
                </span>
                <span className="flex flex-wrap gap-1.5 pt-1">
                  <Tag tone={m.active ? "ok" : "neutral"}>{m.active ? "Ativo" : "Desativado"}</Tag>
                  {m.active ? <Tag tone={m.in_rotation ? "dark" : "neutral"}>{m.in_rotation ? "No rodízio" : "Fora do rodízio"}</Tag> : null}
                </span>
              </div>
              {m.user_id !== me ? (
                <div className="flex flex-wrap gap-2">
                  {m.active ? (
                    <>
                      <Chip
                        selected={m.in_rotation}
                        disabled={pending}
                        onClick={() =>
                          toggle(m, { in_rotation: !m.in_rotation }, m.in_rotation ? "Fora do rodízio" : "De volta ao rodízio")
                        }
                      >
                        {m.in_rotation ? "Tirar do rodízio" : "Voltar ao rodízio"}
                      </Chip>
                      <Chip disabled={pending} onClick={() => setConfirmOff(m)}>
                        Desativar
                      </Chip>
                    </>
                  ) : (
                    <Chip disabled={pending} onClick={() => toggle(m, { active: true }, "Acesso reativado")}>
                      Reativar
                    </Chip>
                  )}
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>

      <section className="grid gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Convites pendentes</h2>
        {invites.length === 0 ? (
          <EmptyState title="Nenhum convite pendente." />
        ) : (
          <ul className="grid gap-2">
            {invites.map((inv) => {
              const { expired } = inv;
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4 text-[13px]">
                  <span className="grid gap-1">
                    <b>{inv.email}</b>
                    <span className="flex gap-1.5">
                      <Tag tone={expired ? "bad" : "warn"}>{expired ? "Convite vencido" : "Convite pendente"}</Tag>
                      <Tag>{inv.role === "gestor" ? "Gestor" : "Corretor"}</Tag>
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <Chip
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await inviteMember(inv.email, inv.role);
                          showToast(r.ok ? (r.emailed ? "Convite reenviado" : "Novo link criado") : (r.error ?? "Erro"));
                          if (r.ok && !r.emailed && r.link) await navigator.clipboard?.writeText(r.link).catch(() => {});
                        })
                      }
                    >
                      Reenviar convite
                    </Chip>
                    <Chip disabled={pending} onClick={() => start(() => cancelInvite(inv.id))}>
                      Cancelar
                    </Chip>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open ? <InviteDialog onClose={() => setOpen(false)} /> : null}
      {confirmOff ? (
        <Dialog title={`Desativar ${confirmOff.name}?`} onClose={() => setConfirmOff(null)}>
          <p className="text-[13px] text-muted">
            A pessoa perde o acesso ao painel na hora. Os leads dela vão para o gestor redistribuir.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setConfirmOff(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toggle(confirmOff, { active: false }, "Acesso desativado");
                setConfirmOff(null);
              }}
            >
              Desativar
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"corretor" | "gestor">("corretor");
  const [result, setResult] = useState<InviteResult>();
  const [pending, start] = useTransition();
  const { showToast } = useToast();
  return (
    <Dialog title="Convidar corretor" onClose={onClose}>
      {result?.ok ? (
        <div className="grid gap-3 text-[13px]">
          {result.emailed ? (
            <p>
              Enviamos o convite para <b>{email}</b>. Ele vale por 7 dias.
            </p>
          ) : (
            <>
              <p>O convite foi criado. O envio por e-mail ainda não está ativo: copie o link e mande para a pessoa.</p>
              <TextField label="Link do convite" value={result.link} readOnly onFocus={(e) => e.target.select()} />
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard?.writeText(result.link!).catch(() => {});
                  showToast("Link copiado");
                }}
              >
                Copiar link
              </Button>
            </>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setResult(await inviteMember(email, role)));
          }}
        >
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={result?.error}
            autoFocus
          />
          <fieldset className="grid gap-2 text-[12.5px] font-semibold">
            <legend className="mb-1.5">Papel</legend>
            <div className="flex gap-2">
              <Chip selected={role === "corretor"} onClick={() => setRole("corretor")}>
                Corretor
              </Chip>
              <Chip selected={role === "gestor"} onClick={() => setRole("gestor")}>
                Gestor
              </Chip>
            </div>
          </fieldset>
          <p className="text-xs text-muted">
            O convite vale por 7 dias. A pessoa entra pelo link e vê só o que o papel dela permite.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              Enviar convite
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="grid w-full max-w-[440px] gap-4 rounded-[22px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold">{title}</h2>
          <IconButton label="Fechar" onClick={onClose} className="border-0">
            <Icon name="x" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
