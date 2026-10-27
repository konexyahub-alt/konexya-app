import { cn } from "@/lib/cn";
import { scoreBand, type ScoreBand } from "@/lib/score-band";

const bandClasses: Record<ScoreBand, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
};

const bandLabels: Record<ScoreBand, string> = {
  ok: "atende ao perfil",
  warn: "atende em parte",
  bad: "não atende ao perfil",
};

/** Nota de compatibilidade (0–100) com a cor da faixa. Nunca aparece sem os motivos ao lado. */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const rounded = Math.round(score);
  const band = scoreBand(rounded);
  return (
    <span
      className={cn(
        "num whitespace-nowrap rounded-full px-2 py-0.5 text-[12.5px] font-extrabold",
        bandClasses[band],
        className,
      )}
      aria-label={`Compatibilidade ${rounded}%, ${bandLabels[band]}`}
    >
      {rounded}%
    </span>
  );
}
