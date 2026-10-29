import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";

/** Layout das telas de acesso do painel: marca à esquerda (computador), formulário à direita. */
export function BrandSplit({ headline, footnote, children }: { headline: ReactNode; footnote: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[40%] max-w-[560px] flex-none flex-col justify-between bg-black p-10 text-white lg:flex xl:p-12">
        <Wordmark className="h-[34px]" />
        <p className="text-[30px] font-light leading-snug">{headline}</p>
        <p className="text-xs text-[#a1a19d]">{footnote}</p>
      </aside>
      <main className="flex min-w-0 flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="flex w-full max-w-[420px] flex-col gap-4">
          <Wordmark className="h-6 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
