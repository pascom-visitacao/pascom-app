"use client";

// Anexos de imagem de uma atividade já existente (modal de detalhe do
// Kanban) - reaproveita a mesma tabela/mecanismo que "Enviar fotos" já
// usa (materials.related_activity_id + uploadMaterial, que sobe pro
// Google Drive institucional), só que com activity_id fixo em vez de
// event_id. Esse caminho de uploadMaterial já existia no backend (ver
// materiais/actions.ts) mas nenhuma tela chamava com activity_id até
// agora - "reaproveitar a lógica já existente, não criar um mecanismo
// novo" (pedido do usuário).
//
// Diferente dos anexos de pedido externo (Storage público, ver
// Attachments em activity-card.tsx), um material do Drive não tem uma
// URL de imagem direta pra usar em <img> - o arquivo só é alcançável
// via link do Drive, que abre a visualização (exige a mesma conta
// Google autorizada a ver a pasta). Por isso a lista abaixo é de link,
// não de miniatura.

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Icon } from "@/components/icon";
import { uploadMaterial } from "@/app/(app)/materiais/actions";
import { compressImage } from "@/lib/compress-image";

export type ActivityMaterial = { id: string; name: string; driveFileId: string };

type PendingStatus = "pendente" | "comprimindo" | "enviando" | "concluido" | "erro";
type PendingItem = { id: string; file: File; preview: string; status: PendingStatus; error?: string };

const COMPRESSION_TARGET_BYTES = 0.7 * 1024 * 1024;

function driveViewUrl(driveFileId: string) {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}

export function ActivityAttachments({
  activityId,
  materials,
  canUpload,
  onUploaded,
}: {
  activityId: string;
  materials: ActivityMaterial[];
  canUpload: boolean;
  /** Chamado depois de cada envio concluído, pra quem estiver renderindo
   *  recarregar a lista de materials (ex.: router.refresh()). */
  onUploaded?: () => void;
}) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(id: string, patch: Partial<PendingItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    const newItems: PendingItem[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "pendente",
    }));
    setItems((prev) => [...prev, ...newItems]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleSubmitAll() {
    setIsSubmitting(true);
    const pending = items.filter((i) => i.status === "pendente" || i.status === "erro");
    for (const item of pending) {
      updateItem(item.id, { status: "comprimindo", error: undefined });
      let fileToSend = item.file;
      try {
        fileToSend = await compressImage(item.file, COMPRESSION_TARGET_BYTES);
      } catch {
        fileToSend = item.file;
      }

      const formData = new FormData();
      formData.append("activity_id", activityId);
      formData.append("file", fileToSend, item.file.name);

      updateItem(item.id, { status: "enviando" });
      try {
        const result = await uploadMaterial(formData);
        if ("error" in result) {
          updateItem(item.id, { status: "erro", error: result.error });
        } else {
          updateItem(item.id, { status: "concluido" });
          onUploaded?.();
        }
      } catch (uploadError) {
        // uploadMaterial pode rejeitar em vez de devolver {error} (ex.:
        // token do Drive expirado - erro de infra, não de validação).
        updateItem(item.id, {
          status: "erro",
          error: uploadError instanceof Error ? uploadError.message : "Erro desconhecido ao enviar.",
        });
      }
    }
    setIsSubmitting(false);
  }

  const pendingCount = items.filter((i) => i.status === "pendente" || i.status === "erro").length;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
      {materials.length > 0 && (
        <div className="activity-attach-list">
          {materials.map((m) => (
            <a
              key={m.id}
              href={driveViewUrl(m.driveFileId)}
              target="_blank"
              rel="noopener noreferrer"
              className="activity-attach-item"
            >
              <span className="activity-attach-item-name">{m.name}</span>
              <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>Abrir no Drive →</span>
            </a>
          ))}
        </div>
      )}

      {canUpload && (
        <>
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isSubmitting}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Icon icon={ImagePlus} size={16} />
              Anexar imagem
            </button>
          </div>

          {items.length > 0 && (
            <>
              <div className="activity-attach-grid">
                {items.map((item) => (
                  <div key={item.id} className="activity-attach-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element -- object URL local (blob:), next/image não suporta */}
                    <img src={item.preview} alt={item.file.name} />
                    <div className="activity-attach-thumb-name">{item.file.name}</div>
                    {(item.status === "pendente" || item.status === "erro") && (
                      <button
                        type="button"
                        className="activity-attach-thumb-remove"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remover ${item.file.name}`}
                      >
                        ×
                      </button>
                    )}
                    {item.status === "comprimindo" && <span className="badge badge-secondary">Comprimindo…</span>}
                    {item.status === "enviando" && <span className="badge badge-secondary">Enviando…</span>}
                    {item.status === "concluido" && <span className="badge badge-success">✓ Enviado</span>}
                    {item.status === "erro" && (
                      <div className="alert alert-danger" style={{ padding: "var(--space-2)" }}>
                        <div style={{ fontSize: "var(--text-xs)" }}>{item.error}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pendingCount > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  style={{ alignSelf: "flex-start" }}
                >
                  {isSubmitting ? "Enviando..." : `Enviar ${pendingCount} imagem${pendingCount === 1 ? "" : "ns"}`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
