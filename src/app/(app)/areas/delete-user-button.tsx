"use client";

import { useTransition } from "react";
import { getUserDeletionImpact, softDeleteUser } from "./actions";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { activityCount, scheduleCount } = await getUserDeletionImpact(userId);

      const parts: string[] = [];
      if (activityCount > 0) parts.push(`${activityCount} tarefa${activityCount === 1 ? "" : "s"}`);
      if (scheduleCount > 0) parts.push(`${scheduleCount} vaga${scheduleCount === 1 ? "" : "s"} de escala`);

      const impact =
        parts.length > 0
          ? `${userName} está vinculado(a) a ${parts.join(" e ")}. Esses vínculos continuam existindo, só passam a mostrar "Usuário excluído".`
          : `${userName} não tem tarefa nem vaga vinculada.`;

      if (!window.confirm(`Excluir ${userName}?\n\n${impact}`)) return;

      await softDeleteUser(userId);
    });
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "..." : "Excluir"}
    </button>
  );
}
