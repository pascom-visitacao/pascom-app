import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewActivityForm } from "./new-activity-form";
import { StatusSelect } from "./status-select";
import { DeleteActivityButton } from "./delete-activity-button";
import type { ActivityStatus } from "./actions";

const COLUMNS: { status: ActivityStatus; label: string }[] = [
  { status: "a_fazer", label: "A fazer" },
  { status: "em_producao", label: "Em produção" },
  { status: "revisao", label: "Revisão" },
  { status: "concluido", label: "Concluído" },
];

type AssigneeRaw = { id: string; name: string; avatar_url: string | null };

function normalizeAssignee(raw: unknown): AssigneeRaw | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : (raw as AssigneeRaw);
}

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area: areaParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, area_id")
    .eq("id", user.id)
    .single();

  const isCoordenacao = profile?.role === "coordenacao_geral";

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");

  const selectedAreaId = areaParam ?? profile?.area_id ?? areas?.[0]?.id ?? null;

  const { data: activities } = selectedAreaId
    ? await supabase
        .from("activities")
        .select("id, title, description, status, due_date, source, assignee:users(id, name, avatar_url)")
        .eq("area_id", selectedAreaId)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: areaMembers } = selectedAreaId
    ? await supabase.from("users").select("id, name").eq("area_id", selectedAreaId).order("name")
    : { data: [] };

  const canWrite = isCoordenacao || profile?.area_id === selectedAreaId;

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Atividades</h1>

        {areas && areas.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
            {areas.map((area) => (
              <Link
                key={area.id}
                href={`/atividades?area=${area.id}`}
                className={`btn btn-sm ${area.id === selectedAreaId ? "btn-primary" : "btn-outline"}`}
              >
                {area.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {!selectedAreaId ? (
        <div className="alert alert-info">
          <div>
            <div className="alert-title">Nenhuma área cadastrada</div>
            Peça pra Coordenação geral criar uma área em Equipe &amp; Áreas antes de abrir cards.
          </div>
        </div>
      ) : (
        <>
          {canWrite ? (
            <div style={{ marginBottom: "var(--space-8)" }}>
              <NewActivityForm areaId={selectedAreaId} members={areaMembers ?? []} />
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "var(--space-6)",
            }}
          >
            {COLUMNS.map((column) => {
              const columnActivities = (activities ?? []).filter((a) => a.status === column.status);
              return (
                <div key={column.status}>
                  <div className="card-stat-label" style={{ marginBottom: "var(--space-4)" }}>
                    {column.label} · {columnActivities.length}
                  </div>
                  <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    {columnActivities.map((activity) => {
                      const assignee = normalizeAssignee(activity.assignee);
                      return (
                        <div key={activity.id} className="card" style={{ padding: "var(--space-5)" }}>
                          {activity.source === "pedido_externo" && (
                            <span
                              className="badge badge-accent"
                              style={{ marginBottom: "var(--space-3)" }}
                            >
                              Pedido externo
                            </span>
                          )}
                          <div className="card-title">{activity.title}</div>
                          {activity.description && (
                            <p className="card-desc" style={{ marginBottom: "var(--space-4)" }}>
                              {activity.description}
                            </p>
                          )}
                          <div
                            className="flex items-center justify-between"
                            style={{ marginBottom: "var(--space-4)" }}
                          >
                            {assignee ? (
                              <span
                                className="flex items-center"
                                style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}
                              >
                                <span className="avatar avatar-sm">
                                  {assignee.name
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </span>
                                {assignee.name}
                              </span>
                            ) : (
                              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
                                Sem responsável
                              </span>
                            )}
                            {activity.due_date && (
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                                {new Date(activity.due_date).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            )}
                          </div>

                          {canWrite && (
                            <div
                              className="flex items-center justify-between"
                              style={{ gap: "var(--space-3)" }}
                            >
                              <StatusSelect activityId={activity.id} status={activity.status} />
                              {isCoordenacao && <DeleteActivityButton activityId={activity.id} />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
