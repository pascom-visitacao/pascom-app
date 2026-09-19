"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { deleteSocialMediaAccount } from "./actions";

export function DeleteSocialMediaButton({ id, platformName }: { id: string; platformName: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await deleteSocialMediaAccount(id);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={() => setOpen(true)}>
        <Icon icon={Trash2} size={16} />
        Remover rede social
      </button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={`Remover ${platformName}?`}
        confirmLabel="Remover"
        isPending={isPending}
      />
    </>
  );
}
