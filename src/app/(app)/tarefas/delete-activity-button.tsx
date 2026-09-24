"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { deleteActivity } from "./actions";

export function DeleteActivityButton({ activityId }: { activityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteActivity(activityId);
      // Falha (ex.: não conseguiu apagar o áudio do Storage) mantém o
      // modal aberto com a mensagem - a atividade continua existindo.
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Icon icon={Trash2} size={16} />
        Excluir tarefa
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Excluir tarefa?"
        body={
          error ? (
            <p role="alert" style={{ color: "var(--color-danger-text)", fontWeight: "var(--weight-medium)" }}>
              {error}
            </p>
          ) : undefined
        }
        isPending={isPending}
      />
    </>
  );
}
