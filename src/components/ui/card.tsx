import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Cartões clicáveis ganham borda preta ao passar o mouse ou focar. */
  interactive?: boolean;
};

/** Cartão branco com sombra suave sobre o fundo papel, cantos arredondados. */
export function Card({ interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-card bg-white p-[18px] shadow-card",
        interactive &&
          "cursor-pointer outline outline-1 outline-transparent transition-[outline-color] hover:outline-black focus-within:outline-black active:outline-black",
        className,
      )}
      {...rest}
    />
  );
}

/** Título de seção em caixa alta, discreto. */
export function SectionTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-xs font-bold uppercase tracking-[0.08em] text-muted", className)}
      {...rest}
    />
  );
}
