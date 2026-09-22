"use client";

// Mesmo padrão de prayer-entry-forms.tsx (edição inline + criação),
// adaptado pra parish_ministries em vez de prayer_fixed_entries - as
// duas tabelas têm o mesmo shape (id, name unique).

import { useActionState, useEffect, useId, useRef } from "react";
import { createParishMinistry, updateParishMinistry } from "./actions";

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      style={{
        flexBasis: "100%",
        fontSize: "var(--text-sm)",
        color: "var(--color-danger-text)",
        fontWeight: "var(--weight-medium)",
      }}
    >
      {message}
    </p>
  );
}

function useFocusOnError(error: string | undefined, state: unknown) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error, state]);
  return inputRef;
}

export function EditMinistryForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState(updateParishMinistry, null);
  const errorId = useId();
  const inputRef = useFocusOnError(state?.error, state);

  return (
    <form
      action={formAction}
      className="flex items-center flex-wrap"
      style={{ gap: "var(--space-3)", flex: "1 1 260px", minWidth: 0 }}
    >
      <input type="hidden" name="id" value={id} />
      <div
        className={`input-wrap${state?.error ? " is-error" : ""}`}
        style={{ flex: "1 1 140px", maxWidth: 260, minWidth: 0 }}
      >
        <input
          ref={inputRef}
          type="text"
          name="name"
          defaultValue={state?.name ?? name}
          aria-label="Nome do ministério/pastoral"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? errorId : undefined}
          required
        />
      </div>
      <button type="submit" className="btn btn-outline btn-sm" disabled={isPending}>
        Salvar
      </button>
      {state?.error && <FieldError id={errorId} message={state.error} />}
    </form>
  );
}

export function NewMinistryForm() {
  const [state, formAction, isPending] = useActionState(createParishMinistry, null);
  const inputId = useId();
  const errorId = useId();
  const inputRef = useFocusOnError(state?.error, state);

  return (
    <form action={formAction} className="flex items-end flex-wrap" style={{ gap: "var(--space-3)" }}>
      <div className="field" style={{ maxWidth: 280 }}>
        <label className="field-label" htmlFor={inputId}>
          Novo ministério/pastoral
        </label>
        <div className={`input-wrap${state?.error ? " is-error" : ""}`}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            name="name"
            placeholder="Ex: Catequese"
            defaultValue={state?.name ?? ""}
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? errorId : undefined}
            required
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
        Adicionar
      </button>
      {state?.error && <FieldError id={errorId} message={state.error} />}
    </form>
  );
}
