"use client";

import { useRef, useState, useTransition } from "react";
import { createEvent, updateEvent, type EventColor } from "./actions";
import { EVENT_COLOR_LABELS } from "./event-color";

export type EventFormData = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  color: EventColor;
};

// datetime-local precisa de "YYYY-MM-DDTHH:mm" em horário local - date
// vem do banco como ISO em UTC.
function toDatetimeLocalValue(isoDate: string) {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ event }: { event?: EventFormData }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(event);

  if (!open) {
    return isEdit ? (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        Editar
      </button>
    ) : (
      <button type="button" className="btn btn-primary btn-md" onClick={() => setOpen(true)}>
        + Novo evento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="card"
      style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      action={(formData) => {
        startTransition(async () => {
          if (event) {
            await updateEvent(event.id, formData);
          } else {
            await createEvent(formData);
            formRef.current?.reset();
          }
          setOpen(false);
        });
      }}
    >
      <div className="field">
        <label className="field-label">
          Título <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="title" placeholder="Ex: Missa das 19h" defaultValue={event?.title} required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Data e hora <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input
            type="datetime-local"
            name="date"
            defaultValue={event ? toDatetimeLocalValue(event.date) : undefined}
            required
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Local</label>
        <div className="input-wrap">
          <input type="text" name="location" placeholder="Ex: Igreja Matriz" defaultValue={event?.location ?? ""} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Descrição</label>
        <textarea className="ds-textarea" name="description" placeholder="Detalhes do evento..." defaultValue={event?.description ?? ""} />
      </div>

      <div className="field">
        <label className="field-label">Cor da etiqueta</label>
        <div className="input-wrap select-wrap">
          <select name="color" defaultValue={event?.color ?? "azul"}>
            {(Object.keys(EVENT_COLOR_LABELS) as EventColor[]).map((key) => (
              <option key={key} value={key}>
                {EVENT_COLOR_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
          {isPending ? "Salvando..." : event ? "Salvar" : "Criar"}
        </button>
        <button type="button" className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
