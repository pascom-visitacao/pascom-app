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
  searchParams: Promise<{ area?: string; origem?: string }>;
}) {
  const { area: areaParam, origem: origemParam } = await searchParams;
  const onlyExternal = origemParam === "pedido_externo";
  const originQs = onlyExternal ? "&origem=pedido_externo" : "";
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

  const showAllAreas = areaParam === "todos";
  const selectedAreaId = showAllAreas ? null : (areaParam ?? myAreaIds[0] ?? areas?.[0]?.id ?? null);

  const activitiesSelect =
    "id, title, description, status, due_date, source, priority, is_urgent, area_id, area:areas(id, name), assignee:users(id, name, avatar_url, account_status), request:external_requests(attachment_urls), event:events(id, title), parish_ministry:parish_ministries(id, name), comments:activity_comments(id, body, created_at, author:users(id, name, account_status))";

  let activitiesQuery = supabase.from("activities").select(activitiesSelect).order("created_at", { ascending: true });
  if (onlyExternal) activitiesQuery = activitiesQuery.eq("source", "pedido_externo");

  const { data: rawActivities } = showAllAreas
    ? await activitiesQuery
    : selectedAreaId
      ? await activitiesQuery.eq("area_id", selectedAreaId)
      : { data: [] };

  // members: sempre a lista completa (sem filtro), pra poder recalcular
  // por área em cada card no modo "Todos" - no modo área única, filtra
  // pra essa área só, igual antes.
  const { data: rawAllMembers } =
    showAllAreas || selectedAreaId
      ? await supabase
          .from("users")
          .select("id, name, area_ids, pending_area_ids, areas_submitted_at")
          .eq("account_status", "active")
          .order("name")
      : { data: [] };

  const activities: (ActivityCardData & { area_id: string })[] = (rawActivities ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    due_date: a.due_date,
    source: a.source,
    priority: a.priority,
    is_urgent: a.is_urgent,
    area_id: a.area_id,
    area: showAllAreas ? normalizeOne(a.area) : null,
    assignee: normalizeOne(a.assignee),
    attachments: normalizeOne<{ attachment_urls: string[] }>(a.request)?.attachment_urls ?? [],
    event: normalizeOne(a.event),
    ministry: normalizeOne(a.parish_ministry),
    comments: (a.comments ?? [])
      .map((c) => ({ ...c, author: normalizeOne<{ id: string; name: string; account_status: string }>(c.author) }))
      .sort((x, y) => x.created_at.localeCompare(y.created_at)),
  }));

  const areaMembers = (rawAllMembers ?? []).filter((m) => effectiveAreaIds(m).includes(selectedAreaId ?? ""));

  const { data: events } = await supabase.from("events").select("id, title, date").order("date");
  const { data: ministries } = await supabase.from("parish_ministries").select("id, name").order("name");

  // Modo "Todos": criar exige escolher uma área específica, então o
  // formulário fica escondido; edição por card usa canWrite calculado
  // por atividade logo abaixo, não esse booleano único.
  const canWrite = !showAllAreas && (isCoordenacao || myAreaIds.includes(selectedAreaId ?? ""));

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Tarefas</h1>

        {areas && areas.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
            <Link
              href={`/tarefas?area=todos${originQs}`}
              className={`btn btn-sm ${showAllAreas ? "btn-primary" : "btn-outline"}`}
            >
              Todos
            </Link>
            {areas.map((area) => (
              <Link
                key={area.id}
                href={`/tarefas?area=${area.id}${originQs}`}
                className={`btn btn-sm ${!showAllAreas && area.id === selectedAreaId ? "btn-primary" : "btn-outline"}`}
              >
                {area.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {onlyExternal && (
        <div className="flex items-center" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <span className="badge badge-primary">Só pedidos externos</span>
          <Link href={areaParam ? `/tarefas?area=${areaParam}` : "/tarefas"} className="btn btn-ghost btn-sm">
            Limpar filtro
          </Link>
        </div>
      )}

      {!selectedAreaId && !showAllAreas ? (
        <div className="alert alert-info">
          <div>
            <div className="alert-title">Nenhuma área cadastrada</div>
            Peça pra Coordenação geral criar uma área em Equipe &amp; Áreas antes de abrir cards.
          </div>
        </div>
      ) : (
        <>
          {canWrite && selectedAreaId ? (
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
                    {columnActivities.length === 0 ? (
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
                        Nenhuma tarefa por aqui — quando sua área tiver algo pra fazer, aparece aqui.
                      </p>
                    ) : (
                      columnActivities.map((activity) => {
                        const cardCanWrite = isCoordenacao || myAreaIds.includes(activity.area_id);
                        const cardMembers = showAllAreas
                          ? (rawAllMembers ?? []).filter((m) => effectiveAreaIds(m).includes(activity.area_id))
                          : (areaMembers ?? []);
                        return (
                          <ActivityCard
                            key={activity.id}
                            activity={activity}
                            canWrite={cardCanWrite}
                            isCoordenacao={isCoordenacao}
                            currentUserId={user.id}
                            members={cardMembers}
                          />
                        );
                      })
                    )}
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
