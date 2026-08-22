"use client";

import { useTransition } from "react";
import { updateUserAssignment } from "./actions";

type Role = "coordenacao_geral" | "pasconeiro";

export function UserAssignmentRow({
  userId,
  role,
  areaId,
  areas,
  disableSelf,
  isProtected,
}: {
  userId: string;
  role: Role;
  areaId: string | null;
  areas: { id: string; name: string }[];
  disableSelf: boolean;
  isProtected?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center" style={{ gap: "var(--space-4)" }}>
      <div className="input-wrap select-wrap" style={{ width: 210, flexShrink: 0 }}>
        <select
          value={role}
          disabled={isPending || disableSelf || isProtected}
          title={isProtected ? "Conta institucional protegida — papel não pode ser alterado" : undefined}
          onChange={(e) => {
            const nextRole = e.target.value as Role;
            startTransition(() => {
              updateUserAssignment(userId, { role: nextRole });
            });
          }}
        >
          <option value="pasconeiro">Pasconeiro</option>
          <option value="coordenacao_geral">Coordenação geral</option>
        </select>
      </div>

      <div className="input-wrap select-wrap" style={{ width: 200, flexShrink: 0 }}>
        <select
          value={areaId ?? ""}
          disabled={isPending}
          onChange={(e) => {
            const nextArea = e.target.value || null;
            startTransition(() => {
              updateUserAssignment(userId, { area_id: nextArea });
            });
          }}
        >
          <option value="">Sem área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
