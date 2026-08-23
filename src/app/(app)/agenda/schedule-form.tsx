"use client";

import { useRef, useState, useTransition } from "react";
import { createSchedule } from "./actions";

export function ScheduleForm({
  eventId,
  areas,
}: {
  eventId: string;
  areas: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Adicionar vaga
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="flex items-end flex-wrap"
      style={{ gap: "var(--space-3)", marginTop: "var(--space-3)" }}
      action={(formData) => {
        startTransition(async () => {
          await createSchedule(formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <input type="hidden" name="event_id" value={eventId} />

      <div className="field" style={{ maxWidth: 180 }}>
        <label className="field-label">Função</label>
        <div className="input-wrap">
          <input type="text" name="role_needed" placeholder="Ex: Fotógrafo" required />
        </div>
      </div>

      <div className="field" style={{ maxWidth: 160 }}>
        <label className="field-label">Área</label>
        <div className="input-wrap select-wrap" style={{ width: 160, flexShrink: 0 }}>
          <select name="area_id" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ maxWidth: 90 }}>
        <label className="field-label">Vagas</label>
        <div className="input-wrap">
          <input type="number" name="quantity" min={1} defaultValue={1} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        Adicionar
      </button>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
