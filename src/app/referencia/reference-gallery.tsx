"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  PropertyCardSkeleton,
  SLOGAN,
  ScoreBadge,
  ScoreRing,
  HelpTip,
  SectionTitle,
  Skeleton,
  Tag,
  TextField,
  TypingIndicator,
  Wordmark,
  YMark,
  useToast,
  type IconName,
} from "@/components/ui";
import { ICONS } from "@/components/ui/brand-assets";

const COLORS: Array<{ token: string; hex: string; use: string }> = [
  { token: "black", hex: "#0b0b0c", use: "Botão principal, texto forte" },
  { token: "ink", hex: "#151516", use: "Texto" },
  { token: "white", hex: "#ffffff", use: "Fundo" },
  { token: "paper", hex: "#f4f4f2", use: "Fundo secundário" },
  { token: "paper-2", hex: "#ebebe8", use: "Esqueleto, etiqueta neutra" },
  { token: "line", hex: "#e2e2df", use: "Borda de cartão" },
  { token: "line-2", hex: "#d3d3cf", use: "Borda de campo" },
  { token: "muted", hex: "#5f5f5c", use: "Texto secundário" },
  { token: "muted-2", hex: "#8a8a86", use: "Texto terciário" },
  { token: "ok", hex: "#1f7a4d", use: "Atende ao perfil" },
  { token: "warn", hex: "#a86a00", use: "Atenção" },
  { token: "bad", hex: "#b3261e", use: "Não atende, erro" },
];

const FILTERS = ["Até R$ 700 mil", "3 quartos", "Apartamento", "Aceita pets"];

export function ReferenceGallery() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string[]>([FILTERS[1]]);

  const toggle = (f: string) =>
    setSelected((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <Tag tone="warn" className="w-fit">
          Ambiente de teste
        </Tag>
        <h1 className="text-2xl font-bold">Componentes base</h1>
        <p className="text-muted">
          Referência visual da etapa 0. Os conteúdos abaixo são exemplos e não representam
          imóveis reais.
        </p>
      </header>

      <Section title="Marca">
        <div className="flex flex-wrap items-end gap-8">
          <Wordmark className="h-10" />
          <YMark className="h-16 text-black" label="Símbolo Konexya" />
          <p className="text-[13px] text-muted">
            Slogan (só na boas-vindas e no login): <b className="text-ink">{SLOGAN}</b>
          </p>
        </div>
      </Section>

      <Section title="Cores">
        <p className="text-[13px] text-muted">
          Cor só com significado. Verde atende ao perfil, amarelo pede atenção, vermelho não
          atende ou indica erro.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.token} className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-10 flex-none rounded-xl border border-line"
                style={{ background: c.hex }}
              />
              <span className="grid text-[12px] leading-tight">
                <b>{c.token}</b>
                <span className="num text-muted-2">{c.hex}</span>
                <span className="text-muted">{c.use}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="grid gap-2">
          <p className="text-2xl font-bold">Título de tela · Montserrat 700</p>
          <p className="text-base font-semibold">Subtítulo · Montserrat 600</p>
          <p>Texto corrido · Montserrat 400, 14 px</p>
          <p className="text-[13px] text-muted">Texto secundário · 13 px</p>
          <p className="num text-3xl font-extrabold tracking-tight">R$ 685.000</p>
        </div>
      </Section>

      <Section title="Botões">
        <p className="text-[13px] text-muted">
          Um único botão principal por tela. Altura mínima de 44 px.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => showToast("Salvo")}>Botão principal</Button>
          <Button variant="secondary">Botão secundário</Button>
          <Button variant="secondary" size="sm">
            Pequeno
          </Button>
          <Button variant="secondary" disabled>
            Desativado
          </Button>
          <Button variant="secondary" loading>
            Enviando
          </Button>
          <IconButton label="Salvar">
            <Icon name="heart" />
          </IconButton>
        </div>
        <div className="max-w-sm rounded-card bg-black p-4">
          <Button variant="inverse" fullWidth>
            Botão sobre fundo preto
          </Button>
        </div>
      </Section>

      <Section title="Chips e etiquetas">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} selected={selected.includes(f)} onClick={() => toggle(f)}>
              {f}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag>Rascunho</Tag>
          <Tag tone="dark">Novo</Tag>
          <Tag tone="ok">Publicado</Tag>
          <Tag tone="warn">Aguardando</Tag>
          <Tag tone="bad">Perdido</Tag>
        </div>
      </Section>

      <Section title="Nota de compatibilidade">
        <p className="text-[13px] text-muted">
          Verde a partir de 85, amarelo de 75 a 84, vermelho abaixo de 75. A nota nunca aparece
          sem os motivos.
        </p>
        <div className="flex flex-wrap gap-3">
          <ScoreBadge score={92} />
          <ScoreBadge score={80} />
          <ScoreBadge score={61} />
          <ScoreRing score={92} />
          <ScoreRing score={80} />
          <ScoreRing score={61} />
        </div>
      </Section>

      <Section title="Ajuda (?)">
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          Prontidão
          <HelpTip label="Prontidão">Toque (ou passe o mouse) para ver a explicação. Use só onde o termo gera dúvida.</HelpTip>
        </p>
      </Section>

      <Section title="Cartões">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <SectionTitle className="mb-3">Cartão simples</SectionTitle>
            <p className="text-muted">Borda fina cinza e cantos arredondados.</p>
          </Card>
          <Card interactive tabIndex={0}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">Exemplo de imóvel</p>
                <p className="text-[12px] text-muted">Apartamento · 3 quartos · 92 m²</p>
              </div>
              <ScoreBadge score={88} />
            </div>
            <ul className="mt-3 grid gap-1 text-[12px]">
              <Reason ok>Dentro do orçamento</Reason>
              <Reason ok>Aceita pets</Reason>
              <Reason>Trajeto acima do limite</Reason>
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid max-w-sm gap-4">
          <TextField label="E-mail" type="email" placeholder="voce@email.com" hint="Enviaremos um código." />
          <TextField label="Código" inputMode="numeric" error="Código incorreto. Confira e tente de novo." />
        </div>
      </Section>

      <Section title="Ícones">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <div key={name} className="grid justify-items-center gap-1 text-[11px] text-muted">
              <Icon name={name} className="text-ink" />
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Estados">
        <div className="grid gap-4 md:grid-cols-2">
          <StateBox label="Carregando">
            <PropertyCardSkeleton />
            <Skeleton className="h-4 w-1/2" />
            <TypingIndicator />
          </StateBox>
          <StateBox label="Vazio">
            <EmptyState
              title="Você ainda não salvou nenhum imóvel."
              description="Toque no coração de um imóvel para guardá-lo aqui."
              action={<Button variant="secondary">Voltar para a conversa</Button>}
            />
          </StateBox>
          <StateBox label="Erro">
            <ErrorState
              title="Não conseguimos carregar os imóveis."
              description="Verifique sua conexão e tente de novo."
              action={<Button variant="secondary">Tentar de novo</Button>}
            />
          </StateBox>
          <StateBox label="Sem internet">
            <div className="overflow-hidden rounded-card border border-line">
              <div className="bg-black px-4 py-2 text-center text-[13px] font-semibold text-white">
                Você está sem conexão
              </div>
              <p className="p-4 text-[13px] text-muted">
                A faixa aparece no topo de qualquer tela quando a conexão cai.
              </p>
            </div>
          </StateBox>
          <StateBox label="Aviso rápido">
            <div>
              <Button variant="secondary" onClick={() => showToast("Mensagem enviada")}>
                Mostrar aviso
              </Button>
            </div>
          </StateBox>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

function StateBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-3">
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      {children}
    </div>
  );
}

function Reason({ ok = false, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <li className={ok ? "flex items-center gap-1.5 text-ok" : "flex items-center gap-1.5 text-bad"}>
      <Icon name={ok ? "check" : "x"} size="sm" />
      {children}
    </li>
  );
}
