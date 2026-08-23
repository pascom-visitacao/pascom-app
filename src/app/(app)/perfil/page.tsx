import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { AreaAdjustment } from "./area-adjustment";
import { effectiveAreaIds } from "@/lib/effective-areas";

const ROLE_LABEL: Record<string, string> = {
  coordenacao_geral: "Coordenação geral",
  pasconeiro: "Pasconeiro",
};

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, phone, bio, skills, social_links, avatar_url, role, area_ids, pending_area_ids, areas_submitted_at")
    .eq("id", user.id)
    .single();

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");

  if (!profile) redirect("/inicio");

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Meu perfil</h1>

      <div className="flex flex-wrap" style={{ gap: "var(--space-7)", alignItems: "flex-start" }}>
        <ProfileForm
          profile={{
            name: profile.name,
            phone: profile.phone,
            bio: profile.bio,
            skills: profile.skills ?? [],
            social_links: profile.social_links ?? [],
            avatar_url: profile.avatar_url,
            roleLabel: profile.role ? (ROLE_LABEL[profile.role] ?? profile.role) : "—",
          }}
        />

        <AreaAdjustment
          areas={areas ?? []}
          currentAreaIds={effectiveAreaIds(profile)}
          pendingAreaIds={profile.pending_area_ids}
          areasSubmittedAt={profile.areas_submitted_at}
        />
      </div>
    </div>
  );
}
