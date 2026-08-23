"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip } from "lucide-react";
import { Icon } from "@/components/icon";
import { uploadCalendarFile } from "./actions";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function CalendarFileForm() {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState("mensal");
  const [referenceYear, setReferenceYear] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // O React reseta os campos não-controlados do form depois de qualquer
  // envio (sucesso ou erro) - sem isso, um erro de validação (ex: "falta
  // o mês") apagava silenciosamente o arquivo já selecionado, obrigando
  // a escolher tudo de novo. Restaura o arquivo depois de um erro.
  useEffect(() => {
    if (!isPending && error && selectedFile && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(selectedFile);
      fileInputRef.current.files = dt.files;
    }
  }, [isPending, error, selectedFile]);

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
            setPeriodType("mensal");
            setReferenceYear("");
            setReferenceMonth("");
            setSelectedFile(null);
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
          <input
            type="number"
            name="reference_year"
            placeholder="2026"
            required
            value={referenceYear}
            onChange={(e) => setReferenceYear(e.target.value)}
          />
        </div>
      </div>

      {periodType === "mensal" && (
        <div className="field">
          <label className="field-label">Mês</label>
          <div className="input-wrap select-wrap">
            <select name="reference_month" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)}>
              <option value="" disabled>
                Selecione...
              </option>
              {MONTHS.map((label, i) => (
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
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center flex-wrap" style={{ gap: "var(--space-3)" }}>
          <button
            type="button"
            className="btn btn-outline btn-md"
            style={{ flexShrink: 0 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon icon={Paperclip} size={18} />
            Escolher arquivo
          </button>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
            {selectedFile?.name ?? "Nenhum arquivo escolhido"}
          </span>
        </div>
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
