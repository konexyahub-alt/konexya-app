import { Suspense } from "react";
import { TabBar } from "@/components/client/tab-bar";
import { Skeleton } from "@/components/ui";
import { requireReadyClient } from "@/lib/auth";
import { FORTALEZA_NEIGHBORHOODS } from "@/lib/neighborhoods";
import { toProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { AccountSection, ProfileEditor } from "./profile-editor";

/** C-05 · Perfil: ver e corrigir tudo o que a IA entendeu; conta e privacidade. */
export default function ProfilePage({ searchParams }: PageProps<"/app/perfil">) {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))]">
        <Suspense fallback={<Skeleton className="mt-10 h-96 rounded-[20px]" />}>
          <Profile searchParams={searchParams} />
        </Suspense>
      </main>
      <TabBar />
    </>
  );
}

async function Profile({ searchParams }: Pick<PageProps<"/app/perfil">, "searchParams">) {
  const { user, name } = await requireReadyClient("/app/perfil");
  const { editar } = await searchParams;
  const supabase = await createClient();
  const [{ data: row }, { data: conversations }] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("user_id", user.id).single(),
    supabase.rpc("my_conversations"),
  ]);
  return (
    <>
      <div className="grid gap-2 px-1 pt-4">
        <p className="trk">Seu perfil</p>
        <h1 className="text-[30px] font-light tracking-tight">{name}</h1>
        <p className="text-[11.5px] text-muted">
          A IA monta este perfil durante a conversa. Toque em Editar para mudar qualquer item: as recomendações se
          atualizam na hora.
        </p>
      </div>
      <ProfileEditor
        profile={toProfile(row)}
        initialEdit={typeof editar === "string" ? editar : null}
        neighborhoods={[...FORTALEZA_NEIGHBORHOODS]}
      />
      <AccountSection
        email={user.email}
        shares={(conversations ?? []).map((c) => ({
          agencyId: c.agency_id,
          agencyName: c.agency_name,
          sharedAt: c.shared_at,
          revoked: c.revoked,
        }))}
        signOut={signOut}
      />
    </>
  );
}
