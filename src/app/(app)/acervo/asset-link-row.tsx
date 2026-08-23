"use client";

import { useState, useTransition } from "react";
import { updateAssetLink, deleteAssetLink } from "./actions";

export type AssetLinkData = {
  id: string;
  name: string;
  reference_link: string;
  notes: string | null;
};

export function AssetLinkRow({ asset, isCoordenacao }: { asset: AssetLinkData; isCoordenacao: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <form
        className="card flex items-end flex-wrap"
        style={{ padding: "var(--space-5)", gap: "var(--space-3)" }}
        action={(formData) => {
          startTransition(async () => {
            await updateAssetLink(asset.id, formData);
            setIsEditing(false);
          });
        }}
      >
        <div className="field" style={{ maxWidth: 200 }}>
          <label className="field-label">Nome</label>
          <div className="input-wrap">
            <input type="text" name="name" defaultValue={asset.name} required />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 280 }}>
          <label className="field-label">Link do Drive</label>
          <div className="input-wrap">
            <input type="url" name="reference_link" defaultValue={asset.reference_link} required />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label className="field-label">Notas (opcional)</label>
          <div className="input-wrap">
            <input type="text" name="notes" defaultValue={asset.notes ?? ""} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={isPending} onClick={() => setIsEditing(false)}>
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div
      className="card flex items-center justify-between flex-wrap"
      style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
    >
      <div>
        <div style={{ fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>{asset.name}</div>
        <a href={asset.reference_link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
          Abrir no Drive
        </a>
        {asset.notes && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
            {asset.notes}
          </div>
        )}
      </div>
      {isCoordenacao && (
        <div className="flex" style={{ gap: "var(--space-2)" }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
            Editar
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={isPending}
            onClick={() => startTransition(() => deleteAssetLink(asset.id))}
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
