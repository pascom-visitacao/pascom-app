"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { Assignees } from "@/components/assignees";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { assumeSchedule, releaseSchedule, deleteSchedule } from "./actions";

export type ScheduleRowData = {
  id: string;
  role_needed: string;
  confirmed: boolean;
  area: { id: string; name: string } | null;
  user: { id: string; name: string; avatar_url: string | null; account_status: string } | null;
};

export function ScheduleRow({
  schedule,
  currentUserId,
  isCoordenacao,
  sameArea,
}: {
  schedule: ScheduleRowData;
  currentUserId: string;
  isCoordenacao: boolean;
  sameArea: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isMine = schedule.user?.id === currentUserId;
  const canClaim = isCoordenacao || sameArea;
  const canRelease = isCoordenacao || isMine;

  function handleDeleteClick() {
    // Vaga aberta: exclui direto. Vaga já assumida: confirmação
    // explícita, já que remove o compromisso de alguém sem aviso prévio.
    if (schedule.confirmed) {
      setConfirmOpen(true);
      return;
    }
    startTransition(() => deleteSchedule(schedule.id));
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      await deleteSchedule(schedule.id);
      setConfirmOpen(false);
    });
  }

  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-bg-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
        <span style={{ fontWeight: "var(--weight-medium)" }}>{schedule.role_needed}</span>
        {schedule.area && <span className="badge badge-neutral">{schedule.area.name}</span>}
        {schedule.user?.account_status === "deleted" ? (
          <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <span className="avatar avatar-sm">?</span>
            <span style={{ color: "var(--color-text-subtle)" }}>Usuário excluído</span>
            {schedule.confirmed && <span className="badge badge-success">Confirmado</span>}
          </span>
        ) : schedule.user ? (
          <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <Assignees
              readOnly
              showNames
              people={[{ id: schedule.user.id, name: schedule.user.name, avatarUrl: schedule.user.avatar_url }]}
              value={[schedule.user.id]}
            />
            {schedule.confirmed && <span className="badge badge-success">Confirmado</span>}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-subtle)" }}>Vaga aberta</span>
        )}
      </div>

      {canClaim && !schedule.user && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => assumeSchedule(schedule.id))}
        >
          Assumir
        </button>
      )}
      {canRelease && schedule.user && (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => releaseSchedule(schedule.id))}
        >
          Liberar
        </button>
      )}
      {isCoordenacao && (
        <button
          type="button"
          className="btn btn-danger btn-icon"
          aria-label="Excluir vaga"
          disabled={isPending}
          onClick={handleDeleteClick}
        >
          <Icon icon={Trash2} size={16} />
        </button>
      )}
      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir vaga?"
        body={<p>Essa vaga já foi assumida por {schedule.user?.name ?? "alguém"}. Excluir mesmo assim?</p>}
        isPending={isPending}
      />
    </div>
  );
}
