"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { getEventDeletionImpact, deleteEvent } from "./actions";

export function DeleteEventButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<string | null>(null);

  function handleOpen() {
    startTransition(async () => {
      const { scheduleCount, activityCount } = await getEventDeletionImpact(eventId);

      const parts: string[] = [];
      if (scheduleCount > 0) parts.push(`${scheduleCount} vaga${scheduleCount === 1 ? "" : "s"} de escala`);
      if (activityCount > 0) parts.push(`${activityCount} tarefa${activityCount === 1 ? "" : "s"} vinculada${activityCount === 1 ? "" : "s"}`);

      setImpact(
        parts.length > 0
          ? `Isso vai excluir ${parts.join(" e ")}. As tarefas continuam existindo, só perdem o vínculo com o evento.`
          : "Não há vagas nem tarefas vinculadas a esse evento.",
      );
      setOpen(true);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await deleteEvent(eventId);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={handleOpen}>
        <Icon icon={Trash2} size={16} />
        Excluir evento
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Excluir “${eventTitle}”?`}
        body={impact ? <p>{impact}</p> : undefined}
        isPending={isPending}
      />
    </>
  );
}
