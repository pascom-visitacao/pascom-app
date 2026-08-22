"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAreaSelection } from "./area-selection-actions";

export function AreaOnboardingModal({ areas }: { areas: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        router.refresh();
      }
    });
  }

  return (
    <div className="modal-overlay is-open">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="area-onboarding-title">
        <div className="modal-header">
          <h3 className="modal-title" id="area-onboarding-title">
            Escolha suas áreas de atuação
          </h3>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: "var(--space-5)" }}>
            Escolha até 3 áreas em que você atua na Pascom. Isso define quais atividades e vagas você pode assumir.
          </p>

          <div className="alert alert-warning" style={{ marginBottom: "var(--space-5)" }}>
            <div>
              Essa primeira escolha vale imediatamente. Ajustes futuros só podem ser feitos 3 dias depois da última
              alteração, e demoram 24h pra valer — então escolha com calma.
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: "var(--space-5)" }}>
              <div>{error}</div>
            </div>
          )}

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
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-md" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Salvando..." : `Confirmar (${selected.length}/3)`}
          </button>
        </div>
      </div>
    </div>
  );
}
