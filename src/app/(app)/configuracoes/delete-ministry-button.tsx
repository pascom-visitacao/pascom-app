"use client";

// Mesmo padrão de DeleteEventButton (agenda/delete-event-button.tsx):
// busca o impacto (quantas tarefas ficam sem esse ministério) antes de
// abrir a confirmação, já que activities.parish_ministry_id usa "on
// delete set null" - excluir aqui desvincula tarefas silenciosamente
// se a pessoa não souber disso antes de confirmar.

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { getMinistryDeletionImpact, deleteParishMinistry } from "./actions";

export function DeleteMinistryButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<string | null>(null);

  function handleOpen() {
    startTransition(async () => {
      const { activityCount } = await getMinistryDeletionImpact(id);

      setImpact(
        activityCount > 0
          ? `${activityCount} tarefa${activityCount === 1 ? "" : "s"} vinculada${activityCount === 1 ? "" : "s"} vão perder esse vínculo (continuam existindo, só ficam sem ministério/pastoral).`
          : "Não há tarefas vinculadas a esse ministério/pastoral.",
      );
      setOpen(true);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await deleteParishMinistry(id);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={handleOpen}>
        <Icon icon={Trash2} size={16} />
        Excluir
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Excluir “${name}”?`}
        body={impact ? <p>{impact}</p> : undefined}
        isPending={isPending}
      />
    </>
  );
}
