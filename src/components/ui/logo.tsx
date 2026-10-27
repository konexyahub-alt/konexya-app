import { cn } from "@/lib/cn";
import { WORDMARK, Y_MARK } from "./brand-assets";

/** Logo "konexya" em minúsculas com o Y pincelado. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      className={cn("h-[22px] w-auto fill-current", className)}
      role="img"
      aria-label="Konexya"
    >
      <path fillRule="evenodd" d={WORDMARK.path} />
    </svg>
  );
}

/** O Y sozinho é o símbolo da marca. */
export function YMark({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${Y_MARK.width} ${Y_MARK.height}`}
      className={cn("h-6 w-auto fill-current", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path fillRule="evenodd" d={Y_MARK.path} />
    </svg>
  );
}

/** Slogan: só na boas-vindas e no login. */
export const SLOGAN = "Você conversa. A Konexya encontra.";
