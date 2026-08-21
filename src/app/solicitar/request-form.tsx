"use client";

import { useState, useTransition } from "react";
import { submitExternalRequest } from "./actions";

type Category = { id: string; name: string };
type EventOption = { id: string; title: string };

export function RequestForm({
  categories,
  events,
}: {
  categories: Category[];
  events: EventOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  if (token) {
    const trackingUrl = `${window.location.origin}/acompanhar/${token}`;
    return (
      <div className="card card-elevated" style={{ maxWidth: 480, padding: "var(--space-9)" }}>
        <span className="badge badge-success" style={{ marginBottom: "var(--space-5)" }}>
          Pedido enviado
        </span>
        <h1 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-4)" }}>
          Recebemos seu pedido!
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
          Guarde este link para acompanhar o andamento — ele é único e não pede login.
        </p>
        <div className="field">
          <div className="input-wrap">
            <input type="text" readOnly value={trackingUrl} onFocus={(e) => e.target.select()} />
          </div>
        </div>
        <a
          href={`/acompanhar/${token}`}
          className="btn btn-primary btn-md"
          style={{ marginTop: "var(--space-6)" }}
        >
          Ver status do pedido
        </a>
      </div>
    );
  }

  return (
    <form
      className="card card-elevated"
      style={{
        maxWidth: 480,
        width: "100%",
        padding: "var(--space-9)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await submitExternalRequest(formData);
          if (result.error) {
            setError(result.error);
          } else if (result.token) {
            setToken(result.token);
          }
        });
      }}
    >
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-3)" }}>
          Solicitar material ou serviço
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
          Pra outras pastorais e ministérios pedirem apoio à Pascom — sem precisar de conta.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <div>{error}</div>
        </div>
      )}

      <div className="field">
        <label className="field-label">
          Categoria <span className="req">*</span>
        </label>
        <div className="input-wrap select-wrap">
          <select name="category_id" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Descrição do pedido <span className="req">*</span>
        </label>
        <textarea
          className="ds-textarea"
          name="description"
          placeholder="Descreva o que você precisa..."
          required
        />
      </div>

      <div className="field">
        <label className="field-label">Prazo desejado</label>
        <div className="input-wrap">
          <input type="date" name="deadline" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Evento relacionado</label>
        <div className="input-wrap select-wrap">
          <select name="event_id" defaultValue="">
            <option value="">Nenhum / não se aplica</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Seu nome <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="requester_name" placeholder="Nome completo" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Contato (e-mail ou WhatsApp) <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="requester_contact" placeholder="Como te encontramos" required />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
