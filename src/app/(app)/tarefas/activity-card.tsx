"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Zap } from "lucide-react";
import { Icon } from "@/components/icon";
import { Assignees, type AssigneePerson } from "@/components/assignees";
import { ActivityAttachments, type ActivityMaterial } from "@/components/activity-attachments";
import { StatusSelect } from "./status-select";
import { DeleteActivityButton } from "./delete-activity-button";
import { assumeActivity, reassignActivity, toggleUrgent, updateActivityArea, type ActivityStatus } from "./actions";
import { CommentsSection, type CommentData } from "./comments-section";

const PRIORITY_LABELS: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORITY_BADGE: Record<string, string> = {
  baixa: "badge-neutral",
  media: "badge-primary",
  alta: "badge-danger",
};

export type ActivityCardData = {
  id: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  due_date: string | null;
  source: "interna" | "pedido_externo";
  priority: string;
  is_urgent: boolean;
  assignee: { id: string; name: string; avatar_url: string | null; account_status: string } | null;
  attachments: string[];
  materials: ActivityMaterial[];
  event: { id: string; title: string } | null;
  ministry: { id: string; name: string } | null;
  comments: CommentData[];
  // Sempre presente (é a área "dona" da atividade) - diferente de `area`
  // abaixo, que é só o objeto {id,name} pra exibir o badge.
  area_id: string;
  // Só populado no modo "Todos" (ver tarefas/page.tsx) - numa área
  // específica já dá pra ver pelas abas, então fica null e o badge não
  // aparece.
  area?: { id: string; name: string } | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UrgentBadge() {
  return (
    <span className="badge badge-dark">
      <Icon icon={Zap} />
      Urgente
    </span>
  );
}

function AssigneeLine({ assignee }: { assignee: ActivityCardData["assignee"] }) {
  if (assignee?.account_status === "deleted") {
    return (
      <span className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
        <span className="avatar avatar-sm">?</span>
        <span style={{ color: "var(--color-text-subtle)" }}>Usuário excluído</span>
      </span>
    );
  }

  return assignee ? (
    <span className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
      {assignee.avatar_url ? (
        <Image
          src={assignee.avatar_url}
          alt={assignee.name}
          width={32}
          height={32}
          className="avatar-photo"
          style={{ width: 32, height: 32 }}
        />
      ) : (
        <span className="avatar avatar-sm">{initials(assignee.name)}</span>
      )}
      {assignee.name}
    </span>
  ) : (
    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>Sem responsável</span>
  );
}

type Member = { id: string; name: string; avatar_url?: string | null };

// Troca o antigo <select> "Atribuir a...": o caminho é o mesmo
// (reassignActivity, que já cuida da RLS, do trigger
// enforce_activity_reassignment e do e-mail pro novo responsável). Continua
// sem "remover responsável" - a action não tem esse caminho -, por isso o
// Assignees fica sem `clearable`.
function AssigneePicker({
  activityId,
  assignee,
  members,
}: {
  activityId: string;
  assignee: ActivityCardData["assignee"];
  members: Member[];
}) {
  const [isPending, startTransition] = useTransition();

  const people: AssigneePerson[] = members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url }));
  const current = assignee && assignee.account_status !== "deleted" ? assignee : null;
  // Quem já é o responsável entra na lista mesmo fora da área (trocou de
  // área depois): sem isso a pílula diria "Sem responsável".
  if (current && !people.some((p) => p.id === current.id)) {
    people.push({ id: current.id, name: current.name, avatarUrl: current.avatar_url });
  }

  return (
    <Assignees
      people={people}
      value={current ? [current.id] : []}
      disabled={isPending}
      onChange={([userId]) => {
        if (userId) startTransition(() => reassignActivity(activityId, userId));
      }}
    />
  );
}

// Só renderizado pra coordenação (ver ActivityCard abaixo) - Pasconeiro
// assume, libera e comenta, mas não reestrutura a atividade pra outra
// área. O trigger enforce_activity_reassignment (fase8) é o backstop
// real contra alguém chamando updateActivityArea direto sem passar pela
// UI; aqui é só a tela deixando de oferecer o controle a quem não pode.
function AreaPicker({
  activityId,
  areaId,
  areas,
}: {
  activityId: string;
  areaId: string;
  areas: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="input-wrap select-wrap" style={{ width: 200, flexShrink: 0 }}>
      <select
        value={areaId}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateActivityArea(activityId, e.target.value))}
      >
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Attachments({ attachments, size }: { attachments: string[]; size: number }) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap" style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
      {attachments.map((url) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL externa do Storage */}
          <img
            src={url}
            alt="Anexo"
            style={{
              width: size,
              height: size,
              objectFit: "cover",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
            }}
          />
        </a>
      ))}
    </div>
  );
}

export function ActivityCard({
  activity,
  canWrite,
  isCoordenacao,
  currentUserId,
  members,
  areas,
}: {
  activity: ActivityCardData;
  canWrite: boolean;
  isCoordenacao: boolean;
  currentUserId: string;
  members: Member[];
  areas: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <div
        className="card"
        style={{ padding: "var(--space-5)", cursor: "pointer" }}
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap items-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          {activity.area && <span className="badge badge-neutral">{activity.area.name}</span>}
          {activity.is_urgent && <UrgentBadge />}
          {activity.source === "pedido_externo" && <span className="badge badge-accent">Pedido externo</span>}
          <span className={`badge ${PRIORITY_BADGE[activity.priority] ?? "badge-neutral"}`}>
            {PRIORITY_LABELS[activity.priority] ?? activity.priority}
          </span>
        </div>
        <div className="card-title">{activity.title}</div>
        {activity.description && (
          <p className="card-desc" style={{ marginBottom: "var(--space-4)" }}>
            {activity.description}
          </p>
        )}
        {(activity.event || activity.ministry) && (
          <div
            className="flex flex-wrap"
            style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
          >
            {activity.event && <span>Evento: {activity.event.title}</span>}
            {activity.ministry && <span>Ministério: {activity.ministry.name}</span>}
          </div>
        )}
        <Attachments attachments={activity.attachments} size={48} />
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
          <AssigneeLine assignee={activity.assignee} />
          {activity.due_date && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
              {new Date(activity.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>

        {canWrite && (
          <div
            className="flex items-center justify-between"
            style={{ gap: "var(--space-3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <StatusSelect activityId={activity.id} status={activity.status} />
            {isCoordenacao && <DeleteActivityButton activityId={activity.id} />}
          </div>
        )}
      </div>

      <div className={`modal-overlay${open ? " is-open" : ""}`} onClick={() => setOpen(false)}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3 className="modal-title" id="activity-modal-title">
              {activity.title}
            </h3>
            <button className="modal-close" aria-label="Fechar" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="flex flex-wrap" style={{ gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
              {activity.area && <span className="badge badge-neutral">{activity.area.name}</span>}
              {activity.is_urgent && <UrgentBadge />}
              {activity.source === "pedido_externo" && <span className="badge badge-accent">Pedido externo</span>}
              <span className={`badge ${PRIORITY_BADGE[activity.priority] ?? "badge-neutral"}`}>
                Prioridade {PRIORITY_LABELS[activity.priority] ?? activity.priority}
              </span>
            </div>

            {activity.description && (
              <p style={{ marginBottom: "var(--space-6)" }}>{activity.description}</p>
            )}

            <Attachments attachments={activity.attachments} size={80} />

            <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
              <div className="flex flex-wrap items-center" style={{ gap: "var(--space-3)" }}>
                <strong>Área:</strong>
                {isCoordenacao ? (
                  <AreaPicker activityId={activity.id} areaId={activity.area_id} areas={areas} />
                ) : (
                  <span className="badge badge-neutral">
                    {activity.area?.name ?? areas.find((a) => a.id === activity.area_id)?.name ?? "—"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center" style={{ gap: "var(--space-3)" }}>
                <strong>Responsável:</strong>
                {isCoordenacao ? (
                  <>
                    {/* Responsável que foi excluído não é uma opção da lista,
                        mas a tela precisa dizer que ele existiu. */}
                    {activity.assignee?.account_status === "deleted" && <AssigneeLine assignee={activity.assignee} />}
                    <AssigneePicker activityId={activity.id} assignee={activity.assignee} members={members} />
                  </>
                ) : activity.assignee && activity.assignee.account_status !== "deleted" ? (
                  <Assignees
                    readOnly
                    showNames
                    people={[
                      { id: activity.assignee.id, name: activity.assignee.name, avatarUrl: activity.assignee.avatar_url },
                    ]}
                    value={[activity.assignee.id]}
                  />
                ) : (
                  <AssigneeLine assignee={activity.assignee} />
                )}
              </div>
              {activity.due_date && (
                <div>
                  <strong>Prazo:</strong>{" "}
                  {new Date(activity.due_date).toLocaleDateString("pt-BR")}
                </div>
              )}
              {activity.event && (
                <div>
                  <strong>Evento relacionado:</strong> {activity.event.title}
                </div>
              )}
              {activity.ministry && (
                <div>
                  <strong>Ministério / pastoral:</strong> {activity.ministry.name}
                </div>
              )}
            </div>

            <div style={{ marginTop: "var(--space-6)" }}>
              <div className="card-title" style={{ marginBottom: "var(--space-3)" }}>
                Anexos
              </div>
              <ActivityAttachments
                activityId={activity.id}
                materials={activity.materials}
                canUpload={canWrite}
                onUploaded={() => router.refresh()}
              />
            </div>

            <CommentsSection
              activityId={activity.id}
              comments={activity.comments}
              currentUserId={currentUserId}
              isCoordenacao={isCoordenacao}
            />
          </div>
          <div className="modal-footer">
            {canWrite && !activity.assignee && (
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={isPending}
                onClick={() => startTransition(() => assumeActivity(activity.id))}
              >
                {isPending ? "Assumindo..." : "Assumir tarefa"}
              </button>
            )}
            {canWrite && (
              <button
                type="button"
                className="btn btn-outline btn-md"
                disabled={isPending}
                onClick={() => startTransition(() => toggleUrgent(activity.id, !activity.is_urgent))}
              >
                <Icon icon={Zap} size={16} />
                {activity.is_urgent ? "Remover urgência" : "Marcar urgente"}
              </button>
            )}
            {canWrite && <StatusSelect activityId={activity.id} status={activity.status} />}
          </div>
        </div>
      </div>
    </>
  );
}
