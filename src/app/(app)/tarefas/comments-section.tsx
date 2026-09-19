"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { addComment, deleteComment } from "./actions";

export type CommentData = {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; name: string; account_status: string } | null;
};

function authorLabel(author: CommentData["author"]) {
  if (!author) return "Ex-membro da equipe";
  if (author.account_status === "deleted") return "Usuário excluído";
  return author.name;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function CommentsSection({
  activityId,
  comments,
  currentUserId,
  isCoordenacao,
}: {
  activityId: string;
  comments: CommentData[];
  currentUserId: string;
  isCoordenacao: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleConfirmDelete() {
    const id = confirmingId;
    if (!id) return;
    startTransition(async () => {
      await deleteComment(id);
      setConfirmingId(null);
    });
  }

  return (
    <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-5)" }}>
      <div className="card-stat-label" style={{ marginBottom: "var(--space-4)" }}>
        Comentários · {comments.length}
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start justify-between" style={{ gap: "var(--space-3)" }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)" }}>
                <strong>{authorLabel(comment.author)}</strong>{" "}
                <span style={{ color: "var(--color-text-muted)" }}>{timeAgo(comment.created_at)}</span>
              </div>
              <div style={{ fontSize: "var(--text-sm)" }}>{comment.body}</div>
            </div>
            {(comment.author?.id === currentUserId || isCoordenacao) && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={isPending}
                onClick={() => setConfirmingId(comment.id)}
              >
                <Icon icon={Trash2} size={16} />
                Apagar comentário
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
            Nenhum comentário ainda.
          </span>
        )}
      </div>

      <ConfirmDeleteModal
        open={confirmingId !== null}
        onClose={() => setConfirmingId(null)}
        onConfirm={handleConfirmDelete}
        title="Apagar comentário?"
        confirmLabel="Apagar"
        isPending={isPending}
      />

      <form
        ref={formRef}
        className="flex items-end"
        style={{ gap: "var(--space-3)" }}
        action={() => {
          const value = text;
          setText("");
          startTransition(() => addComment(activityId, value));
        }}
      >
        <div className="field" style={{ flex: 1 }}>
          <div className="input-wrap">
            <input
              type="text"
              placeholder="Escreva um comentário..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending || !text.trim()}>
          Comentar
        </button>
      </form>
    </div>
  );
}
