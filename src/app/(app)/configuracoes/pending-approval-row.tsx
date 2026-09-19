"use client";

import { useTransition } from "react";
import Image from "next/image";
import { approveUser, rejectUser } from "./actions";

export type PendingUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PendingApprovalRow({ user }: { user: PendingUser }) {
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    if (!window.confirm(`Recusar ${user.name}? A conta é excluída permanentemente.`)) return;
    startTransition(() => rejectUser(user.id));
  }

  return (
    <div
      className="card flex items-center justify-between flex-wrap"
      style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.name}
            width={40}
            height={40}
            className="avatar-photo"
            style={{ width: 40, height: 40 }}
          />
        ) : (
          <span className="avatar avatar-md">{initials(user.name)}</span>
        )}
        <div>
          <div style={{ fontWeight: "var(--weight-semibold)" }}>{user.name}</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{user.email}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-subtle)" }}>
            Cadastro em {new Date(user.created_at).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>
      <div className="flex" style={{ gap: "var(--space-2)" }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => approveUser(user.id))}
        >
          Aprovar
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={isPending} onClick={handleReject}>
          Recusar
        </button>
      </div>
    </div>
  );
}
