"use client";

import { useTransition } from "react";
import { updateUserRole } from "./actions";

type Role = "coordenacao_geral" | "pasconeiro";

export function UserAssignmentRow({
  userId,
  role,
  areaNames,
  disableSelf,
  isProtected,
}: {
  userId: string;
  role: Role;
  areaNames: string[];
  disableSelf: boolean;
  isProtected?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center flex-wrap" style={{ gap: "var(--space-4)" }}>
      <div className="flex flex-wrap" style={{ gap: "var(--space-2)", width: 200, flexShrink: 0 }}>
        {areaNames.length > 0 ? (
          areaNames.map((name) => (
            <span key={name} className="badge badge-neutral">
              {name}
            </span>
          ))
        ) : (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>Nenhuma área ainda</span>
        )}
      </div>

      <div className="input-wrap select-wrap" style={{ width: 210, flexShrink: 0 }}>
        <select
          value={role}
          disabled={isPending || disableSelf || isProtected}
          title={isProtected ? "Conta institucional protegida — papel não pode ser alterado" : undefined}
          onChange={(e) => {
            const nextRole = e.target.value as Role;
            startTransition(() => {
              updateUserRole(userId, nextRole);
            });
          }}
        >
          <option value="pasconeiro">Pasconeiro</option>
          <option value="coordenacao_geral">Coordenação geral</option>
        </select>
      </div>
    </div>
  );
}
