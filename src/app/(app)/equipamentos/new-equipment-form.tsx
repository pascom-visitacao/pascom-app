"use client";

import { useRef, useState, useTransition } from "react";
import { createEquipment } from "./actions";

export function NewEquipmentForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        + Novo equipamento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="card"
      style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createEquipment(formData);
          if (result?.error) {
            setError(result.error);
          } else {
            formRef.current?.reset();
            setOpen(false);
          }
        });
      }}
    >
      {error && (
        <div className="alert alert-danger">
          <div>{error}</div>
        </div>
      )}

      <div className="field">
        <label className="field-label">Nome</label>
        <div className="input-wrap">
          <input type="text" name="name" placeholder="Ex: Câmera Canon T7" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Modelo (opcional)</label>
        <div className="input-wrap">
          <input type="text" name="model" placeholder="Ex: EOS Rebel T7" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Foto (opcional)</label>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
          {isPending ? "Criando..." : "Criar"}
        </button>
        <button type="button" className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
