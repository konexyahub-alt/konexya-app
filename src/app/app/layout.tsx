import type { Metadata } from "next";

export const metadata: Metadata = { title: "Konexya" };

/** App do cliente: pensado para celular; no computador, coluna central estreita. */
export default function ClientLayout({ children }: LayoutProps<"/app">) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white">{children}</div>;
}
