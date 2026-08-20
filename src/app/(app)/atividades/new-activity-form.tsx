"use client";

import { useRef, useState, useTransition } from "react";
import { createActivity } from "./actions";

export function NewActivityForm({
  areaId,
  members,
}: {
  areaId: string;
  members: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-md" onClick={() => setOpen(true)}>
        + Nova atividade
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="card"
      style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      action={(formData) => {
        startTransition(async () => {
          await createActivity(formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <input type="hidden" name="area_id" value={areaId} />

      <div className="field">
        <label className="field-label">
          Título <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="title" placeholder="Ex: Card para o Instagram" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Descrição</label>
        <textarea className="ds-textarea" name="description" placeholder="Detalhes da atividade..." />
      </div>

      <div className="field">
        <label className="field-label">Responsável</label>
        <div className="input-wrap select-wrap">
          <select name="assignee_id" defaultValue="">
            <option value="">Sem responsável</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Prazo</label>
        <div className="input-wrap">
          <input type="date" name="due_date" />
        </div>
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
          Criar
        </button>
        <button type="button" className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
