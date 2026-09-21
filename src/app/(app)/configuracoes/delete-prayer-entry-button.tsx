"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { deletePrayerEntry } from "./actions";

export function DeletePrayerEntryButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await deletePrayerEntry(id);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={() => setOpen(true)}>
        <Icon icon={Trash2} size={16} />
        Remover intenção
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Remover "${name}"?`}
        body={<p>Essa intenção deixa de entrar no sorteio do cartão de oração.</p>}
        confirmLabel="Remover"
        isPending={isPending}
      />
    </>
  );
}
