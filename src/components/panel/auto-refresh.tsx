"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a tela de tempos em tempos enquanto ela está visível (leads novos, mensagens). */
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
