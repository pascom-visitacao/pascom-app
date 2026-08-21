"use client";

import { useRef, useState, useTransition } from "react";
import { createEvent } from "./actions";

export function EventForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-md" onClick={() => setOpen(true)}>
        + Novo evento
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
          await createEvent(formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <div className="field">
        <label className="field-label">
          Título <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="title" placeholder="Ex: Missa das 19h" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Data e hora <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="datetime-local" name="date" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Local</label>
        <div className="input-wrap">
          <input type="text" name="location" placeholder="Ex: Igreja Matriz" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Descrição</label>
        <textarea className="ds-textarea" name="description" placeholder="Detalhes do evento..." />
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
