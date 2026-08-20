"use client";

import { useTransition } from "react";
import { deleteActivity } from "./actions";

export function DeleteActivityButton({ activityId }: { activityId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Excluir esta atividade?")) return;
        startTransition(() => {
          deleteActivity(activityId);
        });
      }}
    >
      Excluir
    </button>
  );
}
