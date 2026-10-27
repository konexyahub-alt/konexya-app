import { cn } from "@/lib/cn";

/** Bloco cinza no formato do conteúdo. Carregando nunca é tela branca. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse-soft rounded-lg bg-paper-2", className)} />;
}

/** Esqueleto de um cartão de imóvel (lista de recomendações). */
export function PropertyCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="grid grid-cols-[92px_1fr] gap-3 rounded-card border border-line p-3"
    >
      <Skeleton className="size-[92px] rounded-xl" />
      <div className="grid content-start gap-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** "Digitando" da conversa: três pontos. */
export function TypingIndicator({ label = "Digitando" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex w-fit gap-1 rounded-[18px] rounded-bl-md bg-paper px-3.5 py-3"
    >
      {[0, 150, 300].map((delay) => (
        <i
          key={delay}
          aria-hidden
          className="block size-1.5 animate-typing rounded-full bg-muted-2"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
