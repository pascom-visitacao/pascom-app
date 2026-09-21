import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { Icon } from "@/components/icon";
import { getCurrentUser, getSupabase } from "@/lib/supabase/request";
import { ProfileForm } from "./profile-form";
import { AreaAdjustment } from "./area-adjustment";
import { effectiveAreaIds } from "@/lib/effective-areas";

const ROLE_LABEL: Record<string, string> = {
  coordenacao_geral: "Coordenação geral",
  pasconeiro: "Pasconeiro",
};

const STATUS_LABEL: Record<string, string> = {
  a_fazer: "A fazer",
  em_producao: "Em produção",
  revisao: "Em revisão",
};

const STATUS_BADGE: Record<string, string> = {
  a_fazer: "badge-neutral",
  em_producao: "badge-primary",
  revisao: "badge-warning",
};

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const [{ data: profile }, { data: areas }, { data: myActivities }] = await Promise.all([
    supabase
      .from("users")
      .select("name, phone, bio, skills, social_links, avatar_url, role, area_ids, pending_area_ids, areas_submitted_at")
      .eq("id", user.id)
      .single(),
    supabase.from("areas").select("id, name").order("name"),
    // mesma regra da tile "Minhas tarefas pendentes" do painel
    supabase
      .from("activities")
      .select("id, title, status, due_date, is_urgent, area_id, area:areas(name)")
      .eq("assignee_id", user.id)
      .neq("status", "concluido")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

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

      <section style={{ marginTop: "var(--space-9)", maxWidth: 880 }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Minhas tarefas pendentes</h2>

        {(myActivities ?? []).length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhuma tarefa pendente atribuída a você.
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
            {(myActivities ?? []).map((activity) => {
              const area = normalizeOne<{ name: string }>(activity.area);
              return (
                <Link
                  key={activity.id}
                  href={`/tarefas?area=${activity.area_id}`}
                  className="card flex items-center justify-between flex-wrap"
                  style={{ padding: "var(--space-5)", gap: "var(--space-3)", color: "var(--color-text)" }}
                >
                  <div>
                    <div style={{ fontWeight: "var(--weight-semibold)" }}>{activity.title}</div>
                    {activity.due_date && (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        Prazo: {new Date(`${activity.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center" style={{ gap: "var(--space-2)" }}>
                    {area && <span className="badge badge-neutral">{area.name}</span>}
                    {activity.is_urgent && (
                      <span className="badge badge-dark">
                        <Icon icon={Zap} />
                        Urgente
                      </span>
                    )}
                    <span className={`badge ${STATUS_BADGE[activity.status] ?? "badge-neutral"}`}>
                      {STATUS_LABEL[activity.status] ?? activity.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
