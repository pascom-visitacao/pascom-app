"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { createPrayerEntry, updatePrayerEntry } from "./actions";

// Mensagem de erro do campo: cor de texto de erro (a --color-danger pura
// não tem contraste suficiente em texto pequeno) e linha própria, pra não
// desalinhar o botão da linha do campo.
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

// Leva o foco pro campo quando o envio volta com erro.
function useFocusOnError(error: string | undefined, state: unknown) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error, state]);
  return inputRef;
}

export function EditPrayerEntryForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState(updatePrayerEntry, null);
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
          aria-label="Nome da intenção"
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

export function NewPrayerEntryForm() {
  const [state, formAction, isPending] = useActionState(createPrayerEntry, null);
  const inputId = useId();
  const errorId = useId();
  const inputRef = useFocusOnError(state?.error, state);

  return (
    <form action={formAction} className="flex items-end flex-wrap" style={{ gap: "var(--space-3)" }}>
      <div className="field" style={{ maxWidth: 280 }}>
        <label className="field-label" htmlFor={inputId}>
          Nova intenção fixa
        </label>
        <div className={`input-wrap${state?.error ? " is-error" : ""}`}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            name="name"
            placeholder="Ex: Bispo da diocese"
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
