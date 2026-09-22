"use client";

// Movido de areas/delete-user-button.tsx na unificação de /areas em /equipe.

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { getUserDeletionImpact, softDeleteUser } from "./actions";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<string | null>(null);

  function handleOpen() {
    startTransition(async () => {
      const { activityCount, scheduleCount } = await getUserDeletionImpact(userId);

      const parts: string[] = [];
      if (activityCount > 0) parts.push(`${activityCount} tarefa${activityCount === 1 ? "" : "s"}`);
      if (scheduleCount > 0) parts.push(`${scheduleCount} vaga${scheduleCount === 1 ? "" : "s"} de escala`);

      setImpact(
        parts.length > 0
          ? `${userName} está vinculado(a) a ${parts.join(" e ")}. Esses vínculos continuam existindo, só passam a mostrar "Usuário excluído".`
          : `${userName} não tem tarefa nem vaga vinculada.`,
      );
      setOpen(true);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await softDeleteUser(userId);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={handleOpen}>
        <Icon icon={Trash2} size={16} />
        Excluir pasconeiro
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Excluir ${userName}?`}
        body={impact ? <p>{impact}</p> : undefined}
        isPending={isPending}
      />
    </>
  );
}
