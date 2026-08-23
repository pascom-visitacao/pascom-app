"use client";

import { useRef, useState, useTransition } from "react";
import { uploadCalendarFile } from "./actions";

export function CalendarFileForm() {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState("mensal");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        + Enviar referência
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
          const result = await uploadCalendarFile(formData);
          if (result.error) {
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
        <label className="field-label">Tipo</label>
        <div className="input-wrap select-wrap">
          <select name="period_type" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Ano</label>
        <div className="input-wrap">
          <input type="number" name="reference_year" placeholder="2026" required />
        </div>
      </div>

      {periodType === "mensal" && (
        <div className="field">
          <label className="field-label">Mês</label>
          <div className="input-wrap select-wrap">
            <select name="reference_month" defaultValue="">
              <option value="" disabled>
                Selecione...
              </option>
              {[
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
              ].map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="field">
        <label className="field-label">Arquivo (PDF ou imagem)</label>
        <input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
