"use client";

import { useTransition } from "react";
import Image from "next/image";
import { takeEquipment, returnEquipment } from "./actions";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type EquipmentData = {
  id: string;
  name: string;
  model: string | null;
  photo_url: string | null;
  holder: { id: string; name: string; avatar_url: string | null } | null;
};

export function EquipmentCard({
  equipment,
  currentUserId,
}: {
  equipment: EquipmentData;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isHeldByMe = equipment.holder?.id === currentUserId;

  return (
    <div
      className="card flex items-center justify-between flex-wrap"
      style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-4)" }}>
        {equipment.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL pública do Storage
          <img
            src={equipment.photo_url}
            alt={equipment.name}
            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "var(--radius-md)" }}
          />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "var(--color-bg-inset)" }} />
        )}
        <div>
          <div style={{ fontWeight: "var(--weight-semibold)" }}>{equipment.name}</div>
          {equipment.model && (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{equipment.model}</div>
          )}
          {equipment.holder ? (
            <div className="flex items-center" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
              {equipment.holder.avatar_url ? (
                <Image
                  src={equipment.holder.avatar_url}
                  alt={equipment.holder.name}
                  width={32}
                  height={32}
                  className="avatar-photo"
                  style={{ width: 32, height: 32 }}
                />
              ) : (
                <span className="avatar avatar-sm">{initials(equipment.holder.name)}</span>
              )}
              <span style={{ fontSize: "var(--text-sm)" }}>{equipment.holder.name}</span>
              <span className="badge badge-warning">Indisponível</span>
            </div>
          ) : (
            <span className="badge badge-success" style={{ marginTop: "var(--space-2)" }}>
              Disponível
            </span>
          )}
        </div>
      </div>

      {equipment.holder ? (
        isHeldByMe && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={isPending}
            onClick={() => startTransition(() => returnEquipment(equipment.id))}
          >
            Devolver
          </button>
        )
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isPending}
          onClick={() => startTransition(() => takeEquipment(equipment.id))}
        >
          Pegar
        </button>
      )}
    </div>
  );
}
