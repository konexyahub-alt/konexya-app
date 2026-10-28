import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel · Konexya" };

export default function PanelRoot({ children }: LayoutProps<"/painel">) {
  return <div className="min-h-dvh bg-paper">{children}</div>;
}
