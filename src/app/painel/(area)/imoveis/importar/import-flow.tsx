"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button, Card, EmptyState, Icon, SectionTitle, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { commitImport, previewImport, type CommitResult, type Preview } from "./actions";

const STEPS = ["Baixar modelo", "Enviar arquivo", "Conferir"];

export function ImportFlow({ canPublish = true }: { canPublish?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview>();
  const [result, setResult] = useState<CommitResult>();
  const [publish, setPublish] = useState(canPublish);
  const [pending, start] = useTransition();
  const step = result ? 3 : preview?.ok ? 2 : 1;

  const send = (file: File) =>
    start(async () => {
      const form = new FormData();
      form.set("arquivo", file);
      setResult(undefined);
      setPreview(await previewImport(form));
    });

  const confirm = () =>
    start(async () => {
      if (!preview?.valid) return;
      setResult(await commitImport(preview.valid.map(({ line, record }) => ({ line, record })), publish));
    });

  const reset = () => {
    setPreview(undefined);
    setResult(undefined);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="grid max-w-4xl gap-6">
      <ol className="grid grid-cols-3 gap-1.5">
        {STEPS.map((label, i) => (
          <li key={label} className={cn("grid gap-1.5 text-xs font-semibold", i === Math.min(step, 2) ? "text-black" : i < step ? "text-muted" : "text-muted-2")}>
            <i className={cn("block h-1 rounded-sm", i === Math.min(step, 2) ? "bg-black" : i < step ? "bg-muted" : "bg-paper-2")} />
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {result ? (
        <Card className="grid gap-3">
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <Icon name="check" className="text-ok" /> Importação concluída
          </p>
          <p className="text-[13px] text-muted">
            {result.created} {result.created === 1 ? "imóvel novo" : "imóveis novos"} e {result.updated}{" "}
            {result.updated === 1 ? "atualizado" : "atualizados"}
            {publish ? ", já publicados." : ", como rascunho."}
          </p>
          {result.failed.length ? <ErrorTable rows={result.failed} /> : null}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/painel/imoveis" className={buttonClasses({ size: "sm" })}>
              Ver imóveis
            </Link>
            <Button variant="secondary" size="sm" onClick={reset}>
              Importar outro arquivo
            </Button>
          </div>
        </Card>
      ) : preview?.ok ? (
        <>
          <p className="text-[13px] text-muted">
            Arquivo <b className="text-ink">{preview.fileName}</b>
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Lidos" value={preview.total ?? 0} />
            <Stat label="Com erro" value={preview.errors?.length ?? 0} tone={preview.errors?.length ? "bad" : undefined} />
            <Stat label="Ganham o selo" value={preview.sealCount ?? 0} tone="ok" />
          </div>
          {preview.valid?.some((v) => v.update) ? (
            <p className="text-[13px] text-muted">
              {preview.valid.filter((v) => v.update).length} imóveis já existem (mesmo código) e serão atualizados.
            </p>
          ) : null}
          {preview.errors?.length ? <ErrorTable rows={preview.errors} /> : null}
          <p className="text-xs text-muted">
            As linhas com erro não são importadas. Corrija na planilha e envie de novo, ou cadastre esses imóveis à mão.
          </p>
          {canPublish ? (
            <label className="flex min-h-touch items-center gap-2.5 text-[13px] font-semibold">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="size-[18px] accent-black" />
              Publicar os imóveis importados (desmarque para importar como rascunho)
            </label>
          ) : (
            <p className="text-[13px] text-muted">
              Os imóveis entram como rascunho. Publicar fica liberado quando a Konexya aprovar seu cadastro.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={reset} disabled={pending}>
              Enviar outro arquivo
            </Button>
            <Button size="sm" onClick={confirm} loading={pending} disabled={!preview.valid?.length}>
              {preview.valid?.length === 1 ? "Importar o imóvel válido" : `Importar os ${preview.valid?.length ?? 0} válidos`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="grid gap-3">
            <SectionTitle>1. Baixe o modelo</SectionTitle>
            <p className="text-[13px] text-muted">
              Preencha um imóvel por linha. As fotos podem vir por link na planilha ou ser enviadas depois, em cada imóvel.
            </p>
            <a href="/painel/modelo-planilha" download className={buttonClasses({ variant: "secondary", size: "sm" }) + " w-fit"}>
              Baixar planilha modelo
            </a>
          </Card>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) send(f);
            }}
            className="grid justify-items-center gap-2.5 rounded-card border-[1.5px] border-dashed border-line-2 p-8 text-center text-[13px] text-muted"
          >
            <Icon name="upload" className="size-6" />
            <b className="text-ink">{pending ? "Lendo a planilha…" : "2. Arraste a planilha preenchida para cá"}</b>
            <span>Arquivo .xlsx ou .csv, até 4 MB e 1.000 imóveis.</span>
            <Button size="sm" onClick={() => input.current?.click()} loading={pending}>
              Escolher arquivo
            </Button>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) send(f);
              }}
            />
          </div>
          {preview && !preview.ok ? (
            <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-bad">
              <Icon name="alert" size="sm" /> {preview.error}
            </p>
          ) : null}
        </>
      )}
      {preview?.ok && !preview.valid?.length && !result ? <EmptyState title="Nenhuma linha válida para importar." /> : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "bad" }) {
  return (
    <Card>
      <SectionTitle>{label}</SectionTitle>
      <p className={cn("num text-[30px] font-extrabold", tone === "ok" && "text-ok", tone === "bad" && "text-bad")}>{value}</p>
    </Card>
  );
}

function ErrorTable({ rows }: { rows: { line: number; reason: string }[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-card border border-line px-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted-2">
            <th className="w-24 py-2.5">Linha</th>
            <th className="py-2.5">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.line} className="border-b border-paper-2 last:border-0">
              <td className="num py-2.5">{r.line}</td>
              <td className="py-2.5">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
