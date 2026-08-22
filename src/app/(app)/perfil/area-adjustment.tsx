"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAreaSelection } from "../area-selection-actions";

export function AreaAdjustment({
  areas,
  currentAreaIds,
  pendingAreaIds,
  areasSubmittedAt,
}: {
  areas: { id: string; name: string }[];
  currentAreaIds: string[];
  pendingAreaIds: string[] | null;
  areasSubmittedAt: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentAreaIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());
  const router = useRouter();

  const nameById = new Map(areas.map((a) => [a.id, a.name]));

  const submittedAt = areasSubmittedAt ? new Date(areasSubmittedAt) : null;
  const cooldownEndsAt = submittedAt ? new Date(submittedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
  const inCooldown = cooldownEndsAt ? cooldownEndsAt.getTime() > now : false;

  const pendingEffectiveAt = submittedAt ? new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000) : null;
  const pendingStillWaiting = Boolean(pendingAreaIds && pendingEffectiveAt && pendingEffectiveAt.getTime() > now);

  function toggle(areaId: string) {
    setSelected((prev) => {
      if (prev.includes(areaId)) return prev.filter((id) => id !== areaId);
      if (prev.length >= 3) return prev;
      return [...prev, areaId];
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitAreaSelection(selected);
      if (result?.error) {
        setError(result.error);
      } else {
        setPickerOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="card" style={{ maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="card-title" style={{ marginBottom: 0 }}>
        Áreas de atuação
      </div>

      <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
        {currentAreaIds.length > 0 ? (
          currentAreaIds.map((id) => (
            <span key={id} className="badge badge-neutral">
              {nameById.get(id) ?? "—"}
            </span>
          ))
        ) : (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
            Nenhuma área selecionada
          </span>
        )}
      </div>

      {pendingStillWaiting && pendingAreaIds && pendingEffectiveAt && (
        <div className="alert alert-info">
          <div>
            Nova seleção enviada, ainda vai entrar em vigor: {pendingAreaIds.map((id) => nameById.get(id) ?? "—").join(", ")}{" "}
            — a partir de {pendingEffectiveAt.toLocaleString("pt-BR")}.
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <div>{error}</div>
        </div>
      )}

      {!pickerOpen ? (
        inCooldown && cooldownEndsAt ? (
          <div className="flex flex-col" style={{ gap: "var(--space-2)", alignItems: "flex-start" }}>
            <button
              type="button"
              className="btn btn-outline btn-md"
              disabled
              title={`Disponível a partir de ${cooldownEndsAt.toLocaleDateString("pt-BR")}`}
              style={{ cursor: "not-allowed" }}
            >
              Ajustar áreas
            </button>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              Você poderá ajustar de novo a partir de {cooldownEndsAt.toLocaleDateString("pt-BR")}.
            </p>
          </div>
        ) : (
          <button type="button" className="btn btn-outline btn-md" onClick={() => setPickerOpen(true)}>
            Ajustar áreas
          </button>
        )
      ) : (
        <>
          <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
            {areas.map((area) => {
              const checked = selected.includes(area.id);
              const disabled = !checked && selected.length >= 3;
              return (
                <label key={area.id} className="checkbox" style={{ opacity: disabled ? 0.5 : 1 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled || isPending}
                    onChange={() => toggle(area.id)}
                  />
                  <span className="box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {area.name}
                </label>
              );
            })}
          </div>
          <div className="flex" style={{ gap: "var(--space-3)" }}>
            <button type="button" className="btn btn-primary btn-md" disabled={isPending} onClick={handleSubmit}>
              {isPending ? "Enviando..." : `Confirmar (${selected.length}/3)`}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={() => setPickerOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </button>
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-subtle)" }}>
            Essa nova seleção só passa a valer 24h depois do envio, e reinicia o prazo de 3 dias pro próximo ajuste.
          </p>
        </>
      )}
    </div>
  );
}
