"use client";

import { useTransition } from "react";
import { getEventDeletionImpact, deleteEvent } from "./actions";

export function DeleteEventButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { scheduleCount, activityCount } = await getEventDeletionImpact(eventId);

      const parts: string[] = [];
      if (scheduleCount > 0) parts.push(`${scheduleCount} vaga${scheduleCount === 1 ? "" : "s"} de escala`);
      if (activityCount > 0) parts.push(`${activityCount} tarefa${activityCount === 1 ? "" : "s"} vinculada${activityCount === 1 ? "" : "s"}`);

      const impact =
        parts.length > 0
          ? `Isso vai excluir ${parts.join(" e ")}. As tarefas continuam existindo, só perdem o vínculo com o evento.`
          : "Não há vagas nem tarefas vinculadas a esse evento.";

      if (!window.confirm(`Excluir "${eventTitle}"?\n\n${impact}`)) return;

      await deleteEvent(eventId);
    });
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "..." : "Excluir"}
    </button>
  );
}
