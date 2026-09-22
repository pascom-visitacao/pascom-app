"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { Icon } from "@/components/icon";
import { createActivity } from "./actions";
import { uploadMaterial } from "@/app/(app)/materiais/actions";
import { compressImage } from "@/lib/compress-image";
import { EventSearchField, type SearchableEvent } from "./event-search-field";

type Member = { id: string; name: string; areaIds: string[] };

// Mesmo alvo de compressão do formulário público /solicitar (ver
// request-form.tsx) - a atividade já nasce com area_id certo, então o
// caminho de pasta no Drive (resolveActivityFolderPath) sai correto
// direto, sem precisar de manual_category.
const COMPRESSION_TARGET_PER_FILE = 0.7 * 1024 * 1024;

type StagedFile = { id: string; file: File; name: string; url: string };

export function NewActivityForm({
  areas,
  defaultAreaId,
  myAreaIds,
  members,
  events,
  ministries,
  isCoordenacao,
  currentUserId,
}: {
  areas: { id: string; name: string }[];
  defaultAreaId: string;
  /** Áreas do usuário atual (Pasconeiro) - ignorado pra coordenação, que vê todas. */
  myAreaIds: string[];
  members: Member[];
  events: SearchableEvent[];
  ministries: { id: string; name: string }[];
  isCoordenacao: boolean;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [areaId, setAreaId] = useState(defaultAreaId);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pasconeiro só pode escolher entre as próprias áreas (pré-seleciona a
  // 1ª, mas permite trocar se atuar em mais de uma - item 7.2 do spec);
  // coordenação tem o campo livre com todas.
  const areaOptions = isCoordenacao ? areas : areas.filter((a) => myAreaIds.includes(a.id));
  const areaMembers = isCoordenacao ? members.filter((m) => m.areaIds.includes(areaId)) : [];

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setStaged((prev) => [
      ...prev,
      ...selected.map((file) => ({ id: crypto.randomUUID(), file, name: file.name, url: URL.createObjectURL(file) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((s) => s.id !== id);
    });
  }

  function resetAndClose() {
    formRef.current?.reset();
    staged.forEach((s) => URL.revokeObjectURL(s.url));
    setStaged([]);
    setAreaId(defaultAreaId);
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-md" onClick={() => setOpen(true)}>
        + Nova tarefa
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="card"
      style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      action={(formData) => {
        setError(null);
        setUploadWarning(null);
        startTransition(async () => {
          const result = await createActivity(formData);
          if ("error" in result) {
            setError(result.error);
            return;
          }

          // Atividade já existe - agora dá pra anexar (materials.related_activity_id
          // só aceita um id que já existe). Sequencial, mesmo padrão de
          // enviar-fotos-form.tsx (uma chamada de Server Action por arquivo).
          const failed: string[] = [];
          for (const s of staged) {
            const compressed = await compressImage(s.file, COMPRESSION_TARGET_PER_FILE).catch(() => s.file);
            const fd = new FormData();
            fd.append("activity_id", result.id);
            fd.append("file", compressed, s.name);
            try {
              const uploadResult = await uploadMaterial(fd);
              if ("error" in uploadResult) failed.push(`${s.name}: ${uploadResult.error}`);
            } catch (uploadError) {
              // uploadMaterial pode rejeitar em vez de devolver {error} (ex.:
              // token do Drive expirado - erro de infra, não de validação).
              // Sem o catch aqui, essa rejeição escapava do startTransition
              // sem tratamento e travava o form em "Criando..." pra sempre.
              failed.push(`${s.name}: ${uploadError instanceof Error ? uploadError.message : "erro desconhecido"}`);
            }
          }

          if (failed.length > 0) {
            // A tarefa já foi criada de qualquer forma - o upload de imagem é
            // best-effort aqui, mesmo padrão do e-mail em reassignActivity.
            // Quem quiser tentar de novo consegue pelo modal de detalhe
            // (ActivityAttachments), que usa o mesmo uploadMaterial.
            setUploadWarning(
              `Tarefa criada, mas ${failed.length} imagem${failed.length === 1 ? "" : "ns"} não ${failed.length === 1 ? "foi enviada" : "foram enviadas"}: ${failed.join("; ")}`,
            );
            return;
          }

          resetAndClose();
        });
      }}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          <div>{error}</div>
        </div>
      )}
      {uploadWarning && (
        <div className="alert alert-warning" role="alert">
          <div>{uploadWarning}</div>
        </div>
      )}

      <div className="field">
        <label className="field-label">
          Título <span className="req">*</span>
        </label>
        <div className="input-wrap">
          <input type="text" name="title" placeholder="Ex: Card para o Instagram" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Descrição</label>
        <textarea className="ds-textarea" name="description" placeholder="Detalhes da tarefa..." />
      </div>

      <div className="field">
        <label className="field-label">
          Área <span className="req">*</span>
        </label>
        <div className="input-wrap select-wrap">
          {/* key força remount ao trocar de área - descarta qualquer responsável
              já escolhido que só fazia sentido na área anterior, em vez de
              deixar um <option> removido "preso" como selecionado. */}
          <select key={`area-${areaId}`} name="area_id" value={areaId} onChange={(e) => setAreaId(e.target.value)} required>
            {areaOptions.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Responsável</label>
        <div className="input-wrap select-wrap">
          <select key={`assignee-${areaId}`} name="assignee_id" defaultValue="">
            <option value="">Sem responsável</option>
            {isCoordenacao ? (
              areaMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))
            ) : (
              <option value={currentUserId}>Eu mesmo</option>
            )}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Prazo</label>
        <div className="input-wrap">
          <input type="date" name="due_date" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Prioridade</label>
        <div className="input-wrap select-wrap">
          <select name="priority" defaultValue="media">
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Evento relacionado</label>
        <EventSearchField name="event_id" events={events} />
      </div>

      <div className="field">
        <label className="field-label">Ministério / pastoral relacionado</label>
        <div className="input-wrap select-wrap">
          <select name="parish_ministry_id" defaultValue="">
            <option value="">Nenhum</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Imagens de referência (opcional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          style={{ display: "none" }}
        />
        <div>
          <button type="button" className="btn btn-outline btn-md" onClick={() => fileInputRef.current?.click()}>
            <Icon icon={ImagePlus} size={18} />
            Escolher imagens
          </button>
        </div>
        <span className="field-hint">Vão direto pro Google Drive da Pascom, na pasta da tarefa.</span>
        {staged.length > 0 && (
          <div className="activity-attach-grid" style={{ marginTop: "var(--space-2)" }}>
            {staged.map((s) => (
              <div key={s.id} className="activity-attach-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL local (blob:), next/image não suporta */}
                <img src={s.url} alt={s.name} />
                <div className="activity-attach-thumb-name">{s.name}</div>
                <button
                  type="button"
                  className="activity-attach-thumb-remove"
                  onClick={() => removeStaged(s.id)}
                  aria-label={`Remover ${s.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex" style={{ gap: "var(--space-3)" }}>
        {uploadWarning ? (
          <button type="button" className="btn btn-primary btn-md" onClick={resetAndClose}>
            Fechar
          </button>
        ) : (
          <>
            <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
              {isPending ? "Criando..." : "Criar"}
            </button>
            <button type="button" className="btn btn-outline btn-md" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </form>
  );
}
