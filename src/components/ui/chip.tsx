import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

/** Chip selecionável (filtros, opções). Selecionado = fundo preto. */
export function Chip({ selected = false, className, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors",
        selected
          ? "border-black bg-black text-white"
          : "border-line-2 bg-white text-ink hover:border-black",
        className,
      )}
      {...rest}
    />
  );
}

type TagTone = "neutral" | "dark" | "ok" | "warn" | "bad";

const tones: Record<TagTone, string> = {
  neutral: "bg-paper-2 text-ink",
  dark: "bg-black text-white",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
};

/** Etiqueta de status, não clicável. Cor só quando o status tem significado. */
export function Tag({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: TagTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em]",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
