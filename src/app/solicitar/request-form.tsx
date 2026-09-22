"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { Icon } from "@/components/icon";
import { submitExternalRequest } from "./actions";
import { compressImage } from "@/lib/compress-image";
import "./solicitar.css";

type Category = { id: string; name: string };
type EventOption = { id: string; title: string };

// Todos os arquivos vão juntos numa chamada só (não um por vez como no
// "Enviar fotos"), então o alvo é por arquivo dividido pelo total
// permitido - com 5 arquivos, 0.7MB cada soma 3.5MB, com margem segura
// abaixo do teto de 4,5MB da própria Vercel pro corpo da function
// inteira (ver next.config.ts).
const COMPRESSION_TARGET_PER_FILE = 0.7 * 1024 * 1024;

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; url: string; size: number }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // revoga as object URLs das miniaturas ao desmontar, pra não vazar
  // memória - o próprio handleFilesChange já revoga as antigas a cada
  // nova seleção.
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só limpeza no unmount, não a cada mudança de previews
  }, []);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    previews.forEach((p) => URL.revokeObjectURL(p.url));

    if (selected.length > 5) {
      setFileError("Envie no máximo 5 imagens.");
      setFiles([]);
      setPreviews([]);
      return;
    }
    const invalidType = selected.find(
      (f) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
    );
    if (invalidType) {
      setFileError(`"${invalidType.name}" não é uma imagem aceita (use JPG, PNG, WEBP ou GIF).`);
      setFiles([]);
      setPreviews([]);
      return;
    }
    setFileError(null);
    setFiles(selected);
    setPreviews(selected.map((f) => ({ name: f.name, url: URL.createObjectURL(f), size: f.size })));
  }

  // Tira só 1 arquivo da seleção sem precisar reabrir o seletor nativo
  // e escolher os 5 de novo (o SO não pré-marca a seleção anterior).
  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  }

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
          formData.delete("attachments");
          setIsCompressing(true);
          for (const file of files) {
            const compressed = await compressImage(file, COMPRESSION_TARGET_PER_FILE);
            formData.append("attachments", compressed);
          }
          setIsCompressing(false);

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
        <div className="alert alert-danger" role="alert">
          <div>{error}</div>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="category_id">
          Categoria <span className="req">*</span>
        </label>
        <div className="input-wrap select-wrap">
          <select id="category_id" name="category_id" required defaultValue="">
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
        <label className="field-label" htmlFor="description">
          Descrição do pedido <span className="req">*</span>
        </label>
        <textarea
          id="description"
          className="ds-textarea"
          name="description"
          placeholder="Descreva o que você precisa..."
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="attachments">Imagens de referência (opcional)</label>
        <input
          id="attachments"
          ref={inputRef}
          type="file"
          name="attachments"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFilesChange}
          style={{ display: "none" }}
        />
        <div>
          <button type="button" className="btn btn-outline btn-md" onClick={() => inputRef.current?.click()}>
            <Icon icon={ImagePlus} size={18} />
            Escolher imagens
          </button>
        </div>
        <span className="field-hint">Até 5 imagens (JPG, PNG, WEBP ou GIF) — comprimidas automaticamente ao enviar.</span>
        {previews.length > 0 && !fileError && (
          <div className="solicitar-grid" style={{ marginTop: "var(--space-2)" }}>
            {previews.map((p, index) => (
              <div key={p.url} className="solicitar-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL local (blob:), next/image não suporta */}
                <img src={p.url} alt={p.name} />
                <div className="solicitar-thumb-name">{p.name}</div>
                <button
                  type="button"
                  className="solicitar-thumb-remove"
                  onClick={() => removeFile(index)}
                  aria-label={`Remover ${p.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {fileError && <span className="field-hint is-error">{fileError}</span>}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="deadline">Prazo desejado</label>
        <div className="input-wrap">
          <input id="deadline" type="date" name="deadline" />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="event_id">Evento relacionado</label>
        <div className="input-wrap select-wrap">
          <select id="event_id" name="event_id" defaultValue="">
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
        <label className="field-label" htmlFor="requester_name">
          Seu nome <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input id="requester_name" type="text" name="requester_name" placeholder="Nome completo" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="requester_contact">
          Contato (e-mail ou WhatsApp) <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input id="requester_contact" type="text" name="requester_contact" placeholder="Como te encontramos" required />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-md" disabled={isPending || !!fileError}>
        {isCompressing ? "Preparando imagens..." : isPending ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
