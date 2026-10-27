import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Cartões clicáveis ganham borda preta ao passar o mouse ou focar. */
  interactive?: boolean;
};

/** Cartão com borda fina cinza e cantos arredondados. */
export function Card({ interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-card border border-line bg-white p-[18px]",
        interactive &&
          "cursor-pointer transition-colors hover:border-black focus-within:border-black active:border-black",
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
