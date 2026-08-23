"use client";

import { useTransition } from "react";
import Image from "next/image";
import { assumeSchedule, releaseSchedule } from "./actions";

export type ScheduleRowData = {
  id: string;
  role_needed: string;
  confirmed: boolean;
  area: { id: string; name: string } | null;
  user: { id: string; name: string; avatar_url: string | null } | null;
};

export function ScheduleRow({
  schedule,
  currentUserId,
  isCoordenacao,
  sameArea,
}: {
  schedule: ScheduleRowData;
  currentUserId: string;
  isCoordenacao: boolean;
  sameArea: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isMine = schedule.user?.id === currentUserId;
  const canClaim = isCoordenacao || sameArea;
  const canRelease = isCoordenacao || isMine;

  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-bg-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
        <span style={{ fontWeight: "var(--weight-medium)" }}>{schedule.role_needed}</span>
        {schedule.area && <span className="badge badge-neutral">{schedule.area.name}</span>}
        {schedule.user ? (
          <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
            {schedule.user.avatar_url ? (
              <Image
                src={schedule.user.avatar_url}
                alt={schedule.user.name}
                width={32}
                height={32}
                className="avatar-photo"
                style={{ width: 32, height: 32 }}
              />
            ) : (
              <span className="avatar avatar-sm">{schedule.user.name.slice(0, 2).toUpperCase()}</span>
            )}
            {schedule.user.name}
            {schedule.confirmed && <span className="badge badge-success">Confirmado</span>}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-subtle)" }}>Vaga aberta</span>
        )}
      </div>

      {canClaim && !schedule.user && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => assumeSchedule(schedule.id))}
        >
          Assumir
        </button>
      )}
      {canRelease && schedule.user && (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => releaseSchedule(schedule.id))}
        >
          Liberar
        </button>
      )}
    </div>
  );
}
