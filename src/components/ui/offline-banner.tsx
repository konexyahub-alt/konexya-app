"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useIsOffline() {
  return useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
}

/** Sem internet: faixa no topo "Você está sem conexão". */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-black px-4 py-2 text-center text-[13px] font-semibold text-white"
    >
      Você está sem conexão
    </div>
  );
}
