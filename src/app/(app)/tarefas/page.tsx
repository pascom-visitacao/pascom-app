import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser, getSupabase } from "@/lib/supabase/request";
import { NewActivityForm } from "./new-activity-form";
import { ActivityCard, type ActivityCardData } from "./activity-card";
import type { ActivityStatus } from "./actions";
import { effectiveAreaIds } from "@/lib/effective-areas";
import "./kanban.css";

const DONE_WINDOW_DAYS = 30;

const COLUMNS: { status: ActivityStatus; label: string; note?: string }[] = [
  { status: "a_fazer", label: "A fazer" },
  { status: "em_producao", label: "Em produção" },
  { status: "revisao", label: "Revisão" },
  { status: "concluido", label: "Concluído", note: `Últimos ${DONE_WINDOW_DAYS} dias` },
];

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

// Monta a URL do filtro de área a partir do conjunto de ids marcados -
// nenhum id = sem parâmetro nenhum (equivale a "Todos"), preservando
// origem= se estiver presente. Centralizado aqui porque cada chip
// (inclusive "Todos") precisa gerar seu próprio href a partir do MESMO
// conjunto atual, só acrescentando/tirando o próprio id.
function buildAreaHref(ids: string[], onlyExternal: boolean) {
  const params = new URLSearchParams();
  if (ids.length > 0) params.set("area", ids.join(","));
  if (onlyExternal) params.set("origem", "pedido_externo");
  const qs = params.toString();
  return `/tarefas${qs ? `?${qs}` : ""}`;
}

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; origem?: string }>;
}) {
  const { area: areaParam, origem: origemParam } = await searchParams;
  const onlyExternal = origemParam === "pedido_externo";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  // 1ª rodada: só o que define as áreas selecionadas.
  const [profile, { data: areas }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("areas").select("id, name").order("name"),
  ]);

  const isCoordenacao = profile?.role === "coordenacao_geral";
  const myAreaIds = profile ? effectiveAreaIds(profile) : [];

  // Filtro por área agora é seleção múltipla (?area=id1,id2), não mais
  // aba única - a página sempre abre em "Todos" (nenhum id marcado) e o
  // usuário recorta por cima, opcionalmente. Nenhuma área marcada
  // equivale a "Todos", nunca a uma tela vazia.
  const selectedAreaIds = (areaParam ?? "").split(",").filter(Boolean);
  const showAllAreas = selectedAreaIds.length === 0;

  const activitiesSelect =
    "id, title, description, status, due_date, source, priority, is_urgent, area_id, area:areas(id, name), assignee:users(id, name, avatar_url, account_status), request:external_requests(attachment_urls), event:events(id, title), parish_ministry:parish_ministries(id, name), comments:activity_comments(id, body, created_at, author:users(id, name, account_status)), materials:materials(id, name, drive_file_id), audio_path, audio_mime, audio_duration_seconds";

  // Concluídas só dos últimos DONE_WINDOW_DAYS dias: a coluna só crescia
  // (todo o histórico, com comentários embutidos, a cada clique).
  const doneSinceDate = new Date();
  doneSinceDate.setDate(doneSinceDate.getDate() - DONE_WINDOW_DAYS);
  const doneSince = doneSinceDate.toISOString();
  let activitiesQuery = supabase
    .from("activities")
    .select(activitiesSelect)
    .or(`status.neq.concluido,updated_at.gte.${doneSince}`)
    .order("created_at", { ascending: true });
  if (onlyExternal) activitiesQuery = activitiesQuery.eq("source", "pedido_externo");

  // 2ª rodada: tudo independente entre si, em paralelo. members: sempre
  // a lista completa (sem filtro) - com seleção múltipla, cada card
  // pode precisar recalcular por uma área diferente das outras
  // (Design + Fotografia marcadas ao mesmo tempo, por exemplo), então
  // não faz mais sentido buscar só os membros de UMA área.
  const [{ data: rawActivities }, { data: rawAllMembers }, { data: events }, { data: ministries }] = await Promise.all([
    showAllAreas ? activitiesQuery : activitiesQuery.in("area_id", selectedAreaIds),
    supabase
      .from("users")
      .select("id, name, avatar_url, area_ids, pending_area_ids, areas_submitted_at")
      .eq("account_status", "active")
      .order("name"),
    supabase.from("events").select("id, title, date").order("date"),
    supabase.from("parish_ministries").select("id, name").order("name"),
  ]);

  // URLs assinadas do áudio dos pedidos (bucket privado), em lote e com
  // o client normal - a policy de SELECT do bucket é só pra authenticated.
  // Validade de 1h pro player; o download gera a própria URL curta sob
  // demanda (getAudioDownloadUrl). RevalidateOnFocus renova ao voltar pra aba.
  const audioPaths = (rawActivities ?? []).map((a) => a.audio_path as string | null).filter((p): p is string => !!p);
  const audioUrlByPath = new Map<string, string>();
  if (audioPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("request-audios").createSignedUrls(audioPaths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) audioUrlByPath.set(item.path, item.signedUrl);
    }
  }

  const activities: ActivityCardData[] = (rawActivities ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    due_date: a.due_date,
    source: a.source,
    priority: a.priority,
    is_urgent: a.is_urgent,
    area_id: a.area_id,
    // Sempre mostra o badge agora - com filtro de seleção múltipla (0,
    // 1 ou várias áreas ao mesmo tempo), esconder o badge só quando
    // exatamente 1 área estava marcada não faz mais sentido (ficaria
    // aparecendo/sumindo conforme o usuário marca/desmarca chips).
    area: normalizeOne(a.area),
    assignee: normalizeOne(a.assignee),
    attachments: normalizeOne<{ attachment_urls: string[] }>(a.request)?.attachment_urls ?? [],
    materials: (a.materials ?? []).map((m) => ({ id: m.id, name: m.name, driveFileId: m.drive_file_id })),
    audio:
      a.audio_path && audioUrlByPath.has(a.audio_path)
        ? {
            url: audioUrlByPath.get(a.audio_path)!,
            mime: (a.audio_mime as string | null) ?? null,
            durationSeconds: (a.audio_duration_seconds as number | null) ?? null,
          }
        : null,
    event: normalizeOne(a.event),
    ministry: normalizeOne(a.parish_ministry),
    comments: (a.comments ?? [])
      .map((c) => ({ ...c, author: normalizeOne<{ id: string; name: string; account_status: string }>(c.author) }))
      .sort((x, y) => x.created_at.localeCompare(y.created_at)),
  }));

  // Criar não depende mais de estar numa aba de área específica (o
  // form ganhou um campo "Área" próprio) - só depende de ter pelo menos
  // 1 área possível pra usar como padrão. Edição por card usa
  // cardCanWrite calculado por atividade logo abaixo, não esse booleano.
  const canCreateActivity = isCoordenacao || myAreaIds.length > 0;
  const defaultAreaId = selectedAreaIds[0] ?? myAreaIds[0] ?? areas?.[0]?.id ?? "";
  const allMembersWithAreas = (rawAllMembers ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    areaIds: effectiveAreaIds(m),
  }));

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Tarefas</h1>

        {areas && areas.length > 0 && (
          <div className="flex flex-col" style={{ gap: "var(--space-2)", alignItems: "flex-start" }}>
            {/* Mesmo estilo de rótulo pequeno já usado nos headers de coluna
                do Kanban logo abaixo (.card-stat-label) - deixa claro que os
                chips são um filtro aplicável por cima do panorama geral, não
                uma categoria fixa da página (a página já abre em "Todos"). */}
            <span id="area-filter-label" className="card-stat-label">
              Filtrar por área
            </span>
            <div className="flex flex-wrap" role="group" aria-labelledby="area-filter-label" style={{ gap: "var(--space-2)" }}>
              {/* "Todos" limpa o filtro inteiro (nenhum id marcado) - é o
                  estado inicial da página, não uma opção mutuamente
                  exclusiva com as áreas: fica em destaque só quando
                  nenhuma área está marcada. */}
              <Link
                href={buildAreaHref([], onlyExternal)}
                aria-pressed={showAllAreas}
                className={`btn btn-sm ${showAllAreas ? "btn-primary" : "btn-outline"}`}
              >
                Todos
              </Link>
              {areas.map((area) => {
                const isSelected = selectedAreaIds.includes(area.id);
                const nextIds = isSelected
                  ? selectedAreaIds.filter((id) => id !== area.id)
                  : [...selectedAreaIds, area.id];
                return (
                  <Link
                    key={area.id}
                    href={buildAreaHref(nextIds, onlyExternal)}
                    aria-pressed={isSelected}
                    className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-outline"}`}
                  >
                    {area.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {onlyExternal && (
        <div className="flex items-center" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <span className="badge badge-primary">Só pedidos externos</span>
          <Link href={buildAreaHref(selectedAreaIds, false)} className="btn btn-ghost btn-sm">
            Limpar filtro
          </Link>
        </div>
      )}

      {(areas ?? []).length === 0 ? (
        <div className="alert alert-info">
          <div>
            <div className="alert-title">Nenhuma área cadastrada</div>
            Peça pra Coordenação geral criar uma área em Equipe antes de abrir cards.
          </div>
        </div>
      ) : (
        <>
          {canCreateActivity ? (
            <div style={{ marginBottom: "var(--space-8)" }}>
              <NewActivityForm
                areas={areas ?? []}
                defaultAreaId={defaultAreaId}
                myAreaIds={myAreaIds}
                members={allMembersWithAreas}
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
                  <div className="card-stat-label" style={{ marginBottom: column.note ? "var(--space-1)" : "var(--space-4)" }}>
                    {column.label} · {columnActivities.length}
                  </div>
                  {column.note && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-subtle)", marginBottom: "var(--space-4)" }}>
                      {column.note}
                    </div>
                  )}
                  <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    {columnActivities.length === 0 ? (
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
                        Nenhuma tarefa por aqui — quando sua área tiver algo pra fazer, aparece aqui.
                      </p>
                    ) : (
                      columnActivities.map((activity) => {
                        const cardCanWrite = isCoordenacao || myAreaIds.includes(activity.area_id);
                        // Sempre pela área DESSA atividade, não da seleção do
                        // filtro - com seleção múltipla, cards de áreas
                        // diferentes podem estar lado a lado na mesma coluna.
                        const cardMembers = (rawAllMembers ?? []).filter((m) =>
                          effectiveAreaIds(m).includes(activity.area_id),
                        );
                        return (
                          <ActivityCard
                            key={activity.id}
                            activity={activity}
                            canWrite={cardCanWrite}
                            isCoordenacao={isCoordenacao}
                            currentUserId={user.id}
                            members={cardMembers}
                            areas={areas ?? []}
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
