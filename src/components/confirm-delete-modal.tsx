"use client";

import { useId, type ReactNode } from "react";

// Modal de confirmação genérico pra qualquer ação destrutiva do app -
// cada botão que usa isso mantém sua própria lógica (buscar contagem de
// impacto, chamar a action certa); só a UI do modal é compartilhada.
export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  irreversible = true,
  isPending = false,
  confirmLabel = "Excluir",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: ReactNode;
  irreversible?: boolean;
  isPending?: boolean;
  confirmLabel?: string;
}) {
  // Um id por instância: uma página pode montar vários modais (um por linha)
  // e um id fixo faria todos herdarem o título do primeiro.
  const titleId = useId();

  return (
    <div
      className={`modal-overlay${open ? " is-open" : ""}`}
      style={{ zIndex: "var(--z-modal-confirm)" }}
      onClick={onClose}
    >
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title" id={titleId}>
            {title}
          </h3>
          <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {body}
          {irreversible && (
            <p style={{ marginTop: body ? "var(--space-4)" : 0, fontWeight: "var(--weight-medium)" }}>
              Esta ação não pode ser desfeita.
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-md" disabled={isPending} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger btn-md" disabled={isPending} onClick={onConfirm}>
            {isPending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
