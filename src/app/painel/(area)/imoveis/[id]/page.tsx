import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Icon, Skeleton } from "@/components/ui";
import { requireDraftingMember } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { DEFAULT_SEAL_RULES, photoUrl, sortPhotos } from "@/lib/property";
import { createClient } from "@/lib/supabase/server";
import { PropertyEditor } from "./property-editor";

/** P-07 · Cadastro e edição de imóvel. */
export default function PropertyEditPage({ params }: PageProps<"/painel/imoveis/[id]">) {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Link href="/painel/imoveis" className="flex min-h-touch w-fit items-center gap-1.5 text-[13px] text-muted">
        <Icon name="back" size="sm" /> Meus imóveis
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Editor params={params} />
      </Suspense>
    </main>
  );
}

async function Editor({ params }: Pick<PageProps<"/painel/imoveis/[id]">, "params">) {
  const { id } = await params;
  const { membership, canPublish } = await requireDraftingMember(`/painel/imoveis/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: property }, { data: members }, { data: rules }] = await Promise.all([
    supabase
      .from("properties")
      .select("*, property_photos(*)")
      .eq("id", id)
      .eq("agency_id", membership.agencyId)
      .maybeSingle(),
    supabase.from("agency_members").select("user_id, name, creci").eq("agency_id", membership.agencyId).eq("active", true).order("name"),
    supabase.from("seal_rules").select("min_photos, min_description_chars").maybeSingle(),
  ]);
  if (!property) notFound();
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { property_photos, ...rest } = property;
  const photos = sortPhotos(property_photos).map((p) => ({
    id: p.id,
    url: photoUrl(p, NEXT_PUBLIC_SUPABASE_URL),
    isCover: p.is_cover,
  }));
  return (
    <PropertyEditor
      property={rest}
      photos={photos}
      agencyId={membership.agencyId}
      canPublish={canPublish}
      brokers={(members ?? []).map((m) => ({ id: m.user_id, name: m.name, creci: m.creci }))}
      sealRules={rules ? { minPhotos: rules.min_photos, minDescriptionChars: rules.min_description_chars } : DEFAULT_SEAL_RULES}
    />
  );
}
