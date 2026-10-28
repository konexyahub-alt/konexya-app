import { cn } from "@/lib/cn";
import { scoreBand, type ScoreBand } from "@/lib/score-band";

const stroke: Record<ScoreBand, string> = { ok: "#1f7a4d", warn: "#a86a00", bad: "#b3261e" };
const labels: Record<ScoreBand, string> = { ok: "atende ao perfil", warn: "atende em parte", bad: "não atende ao perfil" };

/**
 * Nota de compatibilidade em anel (visual v2). A cor segue a faixa (regra 7). Como o ScoreBadge,
 * nunca aparece sem os motivos por perto.
 */
export function ScoreRing({ score, size = 52, className }: { score: number; size?: number; className?: string }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const band = scoreBand(s);
  const width = size >= 64 ? 6 : 4.5;
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className={cn("relative inline-grid flex-none place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compatibilidade ${s}%, ${labels[band]}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebebe8" strokeWidth={width} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke[band]}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={`${(c * s) / 100} ${c}`}
        />
      </svg>
      <span className="num font-extrabold tracking-tight" style={{ fontSize: size >= 64 ? 20 : size >= 50 ? 13 : size >= 40 ? 10.5 : 9 }}>
        {s}%
      </span>
    </span>
  );
}
