import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewActivityForm } from "./new-activity-form";
import { ActivityCard, type ActivityCardData } from "./activity-card";
import type { ActivityStatus } from "./actions";
import { effectiveAreaIds } from "@/lib/effective-areas";
import "./kanban.css";

const COLUMNS: { status: ActivityStatus; label: string }[] = [
  { status: "a_fazer", label: "A fazer" },
  { status: "em_producao", label: "Em produção" },
  { status: "revisao", label: "Revisão" },
  { status: "concluido", label: "Concluído" },
];

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
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
    .select("role, area_ids, pending_area_ids, areas_submitted_at")
    .eq("id", user.id)
    .single();

  const isCoordenacao = profile?.role === "coordenacao_geral";
  const myAreaIds = profile ? effectiveAreaIds(profile) : [];

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");

  const selectedAreaId = areaParam ?? myAreaIds[0] ?? areas?.[0]?.id ?? null;

  const { data: rawActivities } = selectedAreaId
    ? await supabase
        .from("activities")
        .select(
          "id, title, description, status, due_date, source, priority, assignee:users(id, name, avatar_url), request:external_requests(attachment_urls), event:events(id, title), parish_ministry:parish_ministries(id, name), comments:activity_comments(id, body, created_at, author:users(id, name))",
        )
        .eq("area_id", selectedAreaId)
        .order("created_at", { ascending: true })
    : { data: [] };

  const activities: ActivityCardData[] = (rawActivities ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    due_date: a.due_date,
    source: a.source,
    priority: a.priority,
    assignee: normalizeOne(a.assignee),
    attachments: normalizeOne<{ attachment_urls: string[] }>(a.request)?.attachment_urls ?? [],
    event: normalizeOne(a.event),
    ministry: normalizeOne(a.parish_ministry),
    comments: (a.comments ?? [])
      .map((c) => ({ ...c, author: normalizeOne<{ id: string; name: string }>(c.author) }))
      .sort((x, y) => x.created_at.localeCompare(y.created_at)),
  }));

  const { data: rawAreaMembers } = selectedAreaId
    ? await supabase
        .from("users")
        .select("id, name, area_ids, pending_area_ids, areas_submitted_at")
        .order("name")
    : { data: [] };
  const areaMembers = (rawAreaMembers ?? []).filter((m) => effectiveAreaIds(m).includes(selectedAreaId ?? ""));

  const { data: events } = await supabase.from("events").select("id, title").order("date");
  const { data: ministries } = await supabase.from("parish_ministries").select("id, name").order("name");

  const canWrite = isCoordenacao || myAreaIds.includes(selectedAreaId ?? "");

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Tarefas</h1>

        {areas && areas.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
            {areas.map((area) => (
              <Link
                key={area.id}
                href={`/tarefas?area=${area.id}`}
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
              <NewActivityForm
                areaId={selectedAreaId}
                members={areaMembers ?? []}
                events={events ?? []}
                ministries={ministries ?? []}
                isCoordenacao={isCoordenacao}
                currentUserId={user.id}
              />
            </div>
          ) : null}

          {COLUMNS.map((column, i) => (
            <input
              key={column.status}
              type="radio"
              name="kanban-status"
              id={`kanban-status-${column.status}`}
              className="kanban-radio"
              defaultChecked={i === 0}
            />
          ))}

          <div className="tabs kanban-tabs">
            {COLUMNS.map((column) => {
              const count = activities.filter((a) => a.status === column.status).length;
              return (
                <label key={column.status} htmlFor={`kanban-status-${column.status}`} className="tab-item">
                  {column.label} · {count}
                </label>
              );
            })}
          </div>

          <div className="kanban-grid">
            {COLUMNS.map((column) => {
              const columnActivities = activities.filter((a) => a.status === column.status);
              return (
                <div key={column.status} className="kanban-column" data-status={column.status}>
                  <div className="card-stat-label" style={{ marginBottom: "var(--space-4)" }}>
                    {column.label} · {columnActivities.length}
                  </div>
                  <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    {columnActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        canWrite={canWrite}
                        isCoordenacao={isCoordenacao}
                        currentUserId={user.id}
                        members={areaMembers ?? []}
                      />
                    ))}
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
