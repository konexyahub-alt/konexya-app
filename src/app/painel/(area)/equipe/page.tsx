import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { requireApprovedMember } from "@/lib/auth";
import { isPast } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { TeamView } from "./team-view";

/** P-11 · Equipe. */
export default function TeamPage() {
  return (
    <main className="grid gap-5 px-4 py-6 lg:px-9 lg:py-7">
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Team />
      </Suspense>
    </main>
  );
}

async function Team() {
  const { user, membership } = await requireApprovedMember("/painel/equipe");
  if (membership.role !== "gestor" || membership.autonomous) redirect("/painel/imoveis");
  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("agency_members")
      .select("user_id, name, email, role, creci, active, in_rotation")
      .eq("agency_id", membership.agencyId)
      .order("created_at"),
    supabase
      .from("agency_invites")
      .select("id, email, role, expires_at, accepted_at")
      .eq("agency_id", membership.agencyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  return (
    <TeamView
      me={user.id}
      members={members ?? []}
      invites={(invites ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, expired: isPast(i.expires_at) }))}
    />
  );
}
