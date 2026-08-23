"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { StatusSelect } from "./status-select";
import { DeleteActivityButton } from "./delete-activity-button";
import { assumeActivity, reassignActivity, type ActivityStatus } from "./actions";
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
  assignee: { id: string; name: string; avatar_url: string | null } | null;
  attachments: string[];
  event: { id: string; title: string } | null;
  ministry: { id: string; name: string } | null;
  comments: CommentData[];
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

function AssigneeLine({ assignee }: { assignee: ActivityCardData["assignee"] }) {
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

function ReassignSelect({
  activityId,
  currentAssigneeId,
  members,
}: {
  activityId: string;
  currentAssigneeId: string | null;
  members: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="input-wrap select-wrap" style={{ display: "inline-flex", width: "auto" }}>
      <select
        value={currentAssigneeId ?? ""}
        disabled={isPending}
        onChange={(e) => {
          const userId = e.target.value;
          if (!userId) return;
          startTransition(() => reassignActivity(activityId, userId));
        }}
      >
        <option value="" disabled>
          Atribuir a...
        </option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
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
}: {
  activity: ActivityCardData;
  canWrite: boolean;
  isCoordenacao: boolean;
  currentUserId: string;
  members: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div
        className="card"
        style={{ padding: "var(--space-5)", cursor: "pointer" }}
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap items-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
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
              <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
                <strong>Responsável:</strong>
                {isCoordenacao ? (
                  <ReassignSelect
                    activityId={activity.id}
                    currentAssigneeId={activity.assignee?.id ?? null}
                    members={members}
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
                {isPending ? "Assumindo..." : "Assumir atividade"}
              </button>
            )}
            {canWrite && <StatusSelect activityId={activity.id} status={activity.status} />}
            <button className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
