"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateFolderPath, uploadFileToDrive } from "@/lib/google-drive";
import {
  resolveActivityFolderPath,
  resolveManualCategoryPath,
  resolveBulkPhotoUploadPath,
  type ManualCategory,
} from "@/lib/drive-folder-mapping";

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export type UploadMaterialResult = {
  id: string;
  name: string;
  webViewLink: string;
  folderPath: string;
  folderWebViewLink: string;
};

export type UploadMaterialResponse = { error: string } | UploadMaterialResult;

// Limite da Vercel pro corpo de uma Server Action/Function (~4,5MB,
// arquitetura deles, não é configurável) - margem de segurança abaixo
// disso. Compressão client-side (ver enviar-fotos-form.tsx) mantém a
// maioria dos uploads bem abaixo; quando desligada ("manter qualidade
// original"), o arquivo pode passar do limite - ver validação abaixo.
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;

/**
 * Envia um arquivo pro Drive (institucional, via lib/google-drive) e
 * registra a linha correspondente em materials. Dois contextos de
 * chamada, distinguidos pelos campos presentes no FormData:
 * - activity_id: anexo de uma atividade (regras automáticas da seção 3.4,
 *   com manual_category/manual_subfolder como fallback pros casos
 *   não-automatizáveis)
 * - event_id (sem activity_id): tela "Enviar fotos", evento relacionado
 * - nenhum dos dois: "Enviar fotos" sem evento, cai no acervo por mês/data
 */
export async function uploadMaterial(formData: FormData): Promise<UploadMaterialResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return {
      error:
        "Arquivo passa de 4MB (limite da Vercel pra esse tipo de envio). Envie manualmente pelo Google Drive na pasta correta e cole o link depois.",
    };
  }

  const activityId = String(formData.get("activity_id") ?? "") || null;
  const eventId = String(formData.get("event_id") ?? "") || null;
  const manualCategory = (String(formData.get("manual_category") ?? "") || undefined) as
    | ManualCategory
    | undefined;
  const manualSubfolder = String(formData.get("manual_subfolder") ?? "") || undefined;
  const manualMinistryName = String(formData.get("manual_ministry_name") ?? "") || undefined;

  let pathSegments: string[];
  let relatedActivityId: string | null = null;

  if (activityId) {
    const { data: activity, error } = await supabase
      .from("activities")
      .select("title, event:events(title), parish_ministry:parish_ministries(name), area:areas(name)")
      .eq("id", activityId)
      .single();

    if (error || !activity) throw new Error("Tarefa não encontrada");

    relatedActivityId = activityId;
    pathSegments =
      resolveActivityFolderPath(
        {
          title: activity.title,
          event: normalizeOne(activity.event),
          parish_ministry: normalizeOne(activity.parish_ministry),
          area: normalizeOne(activity.area),
        },
        manualSubfolder,
      ) ?? resolveManualCategoryPath(manualCategory, manualMinistryName);
  } else if (eventId) {
    const { data: event, error } = await supabase.from("events").select("title").eq("id", eventId).single();
    if (error || !event) throw new Error("Evento não encontrado");
    pathSegments = resolveBulkPhotoUploadPath(event.title);
  } else {
    pathSegments = resolveBulkPhotoUploadPath();
  }

  const folderId = await findOrCreateFolderPath(pathSegments);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFileToDrive(folderId, file.name, file.type || "application/octet-stream", buffer);

  const { error: insertError } = await supabase.from("materials").insert({
    drive_file_id: uploaded.id,
    name: uploaded.name,
    folder_path: pathSegments.join("/"),
    related_activity_id: relatedActivityId,
    mime_type: uploaded.mimeType,
    uploaded_by: user.id,
  });

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/materiais");

  return {
    id: uploaded.id,
    name: uploaded.name,
    webViewLink: uploaded.webViewLink,
    folderPath: pathSegments.join("/"),
    folderWebViewLink: `https://drive.google.com/drive/folders/${folderId}`,
  };
}
