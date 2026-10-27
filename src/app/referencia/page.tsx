import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appEnv } from "@/lib/env";
import { ReferenceGallery } from "./reference-gallery";

export const metadata: Metadata = { title: "Componentes base · Konexya" };

/** Página de referência dos componentes base. Não existe em produção. */
export default function ReferencePage() {
  if (appEnv() === "producao") notFound();
  return <ReferenceGallery />;
}
