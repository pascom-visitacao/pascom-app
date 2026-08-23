"use client";

import { useTransition } from "react";
import { updateActivityStatus, type ActivityStatus } from "./actions";

const STATUS_LABELS: Record<ActivityStatus, string> = {
  a_fazer: "A fazer",
  em_producao: "Em produção",
  revisao: "Revisão",
  concluido: "Concluído",
};

export function StatusSelect({
  activityId,
  status,
  disabled,
}: {
  activityId: string;
  status: ActivityStatus;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="input-wrap select-wrap" style={{ minWidth: 150, flexShrink: 0 }}>
      <select
        value={status}
        disabled={disabled || isPending}
        onChange={(e) => {
          const next = e.target.value as ActivityStatus;
          startTransition(() => {
            updateActivityStatus(activityId, next);
          });
        }}
      >
        {(Object.entries(STATUS_LABELS) as [ActivityStatus, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
