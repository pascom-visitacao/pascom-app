"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal de confirmação genérico pra qualquer ação destrutiva do app -
// cada botão que usa isso mantém sua própria lógica (buscar contagem de
// impacto, chamar a action certa); só a UI do modal é compartilhada.
//
// Teclado: ao abrir, o foco vai pro "Cancelar" (a opção segura numa ação
// destrutiva); Tab/Shift+Tab ficam presos dentro do modal; Esc fecha (menos
// durante o envio); ao fechar, o foco volta pro elemento que abriu o modal.
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Foco: entra no modal ao abrir, volta pra quem abriu ao fechar. O retorno
  // espera um frame porque, num fluxo de exclusão, o botão de origem ainda
  // está desabilitado (isPending) no render em que o modal fecha.
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialTarget = cancelRef.current && !cancelRef.current.disabled ? cancelRef.current : dialogRef.current;
    initialTarget?.focus();

    return () => {
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [open]);

  // Esc fecha e Tab fica preso. No capture pra ganhar de qualquer handler
  // de um modal por baixo (ex: confirmar exclusão dentro do modal de tarefa).
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (!isPending) onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, isPending, onClose]);

  return (
    <div
      className={`modal-overlay${open ? " is-open" : ""}`}
      style={{ zIndex: "var(--z-modal-confirm)" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ outline: "none" }}
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
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-outline btn-md"
            disabled={isPending}
            onClick={onClose}
          >
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
