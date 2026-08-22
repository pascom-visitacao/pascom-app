"use client";

import { useRef, useState } from "react";
import { uploadMaterial, type UploadMaterialResult } from "./actions";
import "./materiais.css";

type Status = "pendente" | "comprimindo" | "enviando" | "concluido" | "erro";

type UploadItem = {
  id: string;
  file: File;
  preview: string;
  keepOriginal: boolean;
  status: Status;
  error?: string;
  result?: UploadMaterialResult;
};

// Alvo pós-compressão, com margem abaixo do limite de 4MB do servidor
// (src/app/(app)/materiais/actions.ts) - sobra espaço pra variações de
// codificação entre o canvas e o multipart final.
const COMPRESSION_TARGET_BYTES = 3.5 * 1024 * 1024;
const MAX_DIMENSION = 2000;

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

  while (blob && blob.size > COMPRESSION_TARGET_BYTES && quality > 0.35) {
    quality -= 0.15;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

export function EnviarFotosForm({ events }: { events: { id: string; title: string }[] }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      keepOriginal: false,
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

  async function uploadOne(item: UploadItem) {
    let fileToSend = item.file;

    if (!item.keepOriginal && item.file.type.startsWith("image/")) {
      updateItem(item.id, { status: "comprimindo" });
      try {
        fileToSend = await compressImage(item.file);
      } catch {
        fileToSend = item.file;
      }
    }

    const formData = new FormData();
    formData.append("file", fileToSend);
    if (eventId) formData.append("event_id", eventId);

    updateItem(item.id, { status: "enviando" });
    const result = await uploadMaterial(formData);

    if ("error" in result) {
      updateItem(item.id, { status: "erro", error: result.error });
    } else {
      updateItem(item.id, { status: "concluido", result });
    }
  }

  async function handleSubmitAll() {
    setIsSubmitting(true);
    const pending = items.filter((i) => i.status === "pendente" || i.status === "erro");
    for (const item of pending) {
      await uploadOne(item);
    }
    setIsSubmitting(false);
  }

  const doneCount = items.filter((i) => i.status === "concluido").length;
  const pendingCount = items.filter((i) => i.status === "pendente" || i.status === "erro").length;
  const lastSuccess = [...items].reverse().find((i) => i.result)?.result;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
      <div className="field" style={{ maxWidth: 420 }}>
        <label className="field-label">Evento relacionado (opcional)</label>
        <div className="input-wrap select-wrap">
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={isSubmitting}>
            <option value="">Sem evento — vai pro acervo por data</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isSubmitting}
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="materiais-grid">
            {items.map((item) => (
              <div key={item.id} className="materiais-thumb">
                <img src={item.preview} alt={item.file.name} />

                <div className="materiais-thumb-info">
                  <div className="materiais-thumb-name">{item.file.name}</div>
                  <div className="materiais-thumb-size">{(item.file.size / 1024 / 1024).toFixed(1)}MB</div>
                </div>

                <label className="materiais-thumb-checkbox">
                  <input
                    type="checkbox"
                    checked={item.keepOriginal}
                    disabled={item.status === "enviando" || item.status === "comprimindo"}
                    onChange={(e) => updateItem(item.id, { keepOriginal: e.target.checked })}
                  />
                  Manter qualidade original (impressão)
                </label>

                {item.status === "pendente" && (
                  <button
                    type="button"
                    className="materiais-thumb-remove"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remover"
                  >
                    ×
                  </button>
                )}

                {item.status === "comprimindo" && <span className="badge badge-secondary">Comprimindo…</span>}
                {item.status === "enviando" && <span className="badge badge-secondary">Enviando…</span>}
                {item.status === "concluido" && <span className="badge badge-success">✓ Enviado</span>}
                {item.status === "erro" && (
                  <div className="alert alert-danger" style={{ marginTop: "var(--space-2)" }}>
                    <div>{item.error}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center" style={{ gap: "var(--space-4)" }}>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleSubmitAll}
              disabled={isSubmitting || pendingCount === 0}
            >
              {isSubmitting ? `Enviando ${doneCount + 1} de ${items.length}…` : `Enviar todas (${pendingCount})`}
            </button>
            {doneCount > 0 && (
              <span className="card-stat-label">
                {doneCount} de {items.length} enviadas
              </span>
            )}
          </div>

          {!isSubmitting && doneCount === items.length && items.length > 0 && lastSuccess && (
            <div className="alert alert-success">
              <div>
                Tudo enviado.{" "}
                <a href={lastSuccess.folderWebViewLink} target="_blank" rel="noreferrer">
                  Ver pasta no Drive
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
