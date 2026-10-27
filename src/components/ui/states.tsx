import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type StateProps = {
  title: string;
  description?: ReactNode;
  /** Botão que leva à ação (ex.: "Voltar para a conversa"). */
  action?: ReactNode;
  className?: string;
};

/** Vazio: quadro tracejado com uma frase do que falta e um botão que leva à ação. */
export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-2.5 rounded-2xl border border-dashed border-line-2 p-[22px] text-center text-[13px] text-muted",
        className,
      )}
    >
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

/**
 * Erro: frase simples do que deu errado e o que fazer, com "Tentar de novo".
 * Nunca mostra código técnico.
 */
export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "grid justify-items-center gap-2.5 rounded-2xl border border-line p-[22px] text-center text-[13px] text-muted",
        className,
      )}
    >
      <Icon name="alert" className="text-bad" />
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
