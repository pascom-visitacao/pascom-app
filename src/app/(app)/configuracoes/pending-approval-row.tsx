"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { UserX } from "lucide-react";
import { Icon } from "@/components/icon";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirmReject() {
    startTransition(async () => {
      await rejectUser(user.id);
      setConfirmOpen(false);
    });
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
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
        >
          <Icon icon={UserX} size={16} />
          Recusar conta
        </button>
      </div>
      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmReject}
        title={`Recusar ${user.name}?`}
        body={<p>A conta é excluída permanentemente — nome, e-mail e o acesso de login, tudo removido.</p>}
        confirmLabel="Recusar"
        isPending={isPending}
      />
    </div>
  );
}
