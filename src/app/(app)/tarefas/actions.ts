"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, activityAssignedEmail } from "@/lib/email";

export type ActivityStatus = "a_fazer" | "em_producao" | "revisao" | "concluido";
export type ActivityPriority = "baixa" | "media" | "alta";

// Retorna o id da atividade criada (não só void) - o form precisa dele
// pra anexar imagens logo em seguida (materials.related_activity_id só
// aceita um activity_id que já existe, ver new-activity-form.tsx).
export async function createActivity(formData: FormData): Promise<{ error: string } | { id: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const priority = String(formData.get("priority") ?? "media") as ActivityPriority;
  const eventId = String(formData.get("event_id") ?? "");
  const parishMinistryId = String(formData.get("parish_ministry_id") ?? "");

  if (!title || !areaId) return { error: "Preencha o título e a área." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({
      title,
      description: description || null,
      area_id: areaId,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      priority,
      event_id: eventId || null,
      parish_ministry_id: parishMinistryId || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return { id: data.id };
}

// Só coordenação geral pode mudar a área depois de criada - a UI já
// esconde o controle pra quem não é, mas o trigger
// enforce_activity_reassignment (20260922090000_fase8_kanban_area_edit_lock.sql)
// é o backstop real, igual o padrão já usado pra reatribuição de
// responsável.
export async function updateActivityArea(activityId: string, areaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").update({ area_id: areaId }).eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

export async function updateActivityStatus(activityId: string, status: ActivityStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .update({ status })
    .eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

// Marca/desmarca urgência - manual, só depois que a atividade já existe
// (não faz parte da criação nem do formulário público). Mesmo nível de
// acesso que já rege priority: sem checagem extra aqui, a RLS de
// activities (coordenação, responsável, ou qualquer um da área) é quem
// decide se o UPDATE passa ou não.
export async function toggleUrgent(activityId: string, urgent: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .update({ is_urgent: urgent })
    .eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

export async function assumeActivity(activityId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("activities")
    .update({ assignee_id: user.id })
    .eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

// Atribuição direta pela Coordenação - diferente de assumeActivity
// (self-service, só o próprio usuário, só quando a vaga está vazia).
// A UI só mostra esse controle pra isCoordenacao, mas a RLS + o trigger
// enforce_activity_reassignment já são o backstop real independente disso.
export async function reassignActivity(activityId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .update({ assignee_id: userId })
    .eq("id", activityId)
    .select("title, assignee:users(email, name)")
    .single();

  if (error) throw new Error(error.message);

  // Notificação é best-effort: a reatribuição já aconteceu de qualquer
  // forma, uma instabilidade do provedor de e-mail não pode desfazê-la.
  try {
    const assignee = Array.isArray(data.assignee) ? data.assignee[0] : data.assignee;
    if (assignee?.email) {
      await sendEmail({
        to: [assignee.email],
        subject: `Tarefa atribuída a você: ${data.title}`,
        html: activityAssignedEmail(data.title),
      });
    }
  } catch (notifyError) {
    console.error("Falha ao notificar atribuição de atividade", { activityId, notifyError });
  }

  revalidatePath("/tarefas");
}

const AUDIO_BUCKET = "request-audios";
const AUDIO_DELETE_ERROR = "Não foi possível apagar o áudio. Tente novamente.";

// ÚNICO caminho que exclui atividades no app (auditado: excluir evento,
// recusar/excluir usuário e limpar pedido só desvinculam via "on delete
// set null", nunca apagam a linha). Qualquer caminho novo que apague
// atividade precisa passar por aqui, senão o áudio do pedido vira
// arquivo órfão no Storage (spec-audio-pedidos.md, seção 7.2).
//
// Ordem obrigatória: ler audio_path -> remover o arquivo -> SÓ ENTÃO
// apagar a linha. Se a remoção falhar, aborta com erro e a atividade
// continua existindo apontando pro arquivo (o inverso deixaria o
// arquivo sem referência nenhuma).
export async function deleteActivity(activityId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: activity, error: readError } = await supabase
    .from("activities")
    .select("audio_path")
    .eq("id", activityId)
    .maybeSingle();
  if (readError) return { error: readError.message };

  const audioPath = activity?.audio_path as string | null | undefined;
  if (audioPath) {
    const { error: removeError } = await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
    if (removeError) return { error: AUDIO_DELETE_ERROR };

    // remove() não falha quando a policy esconde o arquivo (devolve lista
    // vazia sem erro): confere que ele sumiu de verdade. Já não existir
    // (apagado à mão antes) também serve - só não pode ter sobrado.
    // list() em vez de exists(): exists() devolve erro (não "false") pra
    // objeto ausente com a policy de SELECT ativa, e isso abortava a
    // exclusão mesmo com o arquivo já removido.
    const { data: leftover, error: listError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .list("", { search: audioPath, limit: 5 });
    if (listError || leftover?.some((o) => o.name === audioPath)) return { error: AUDIO_DELETE_ERROR };
  }

  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return {};
}

// URL assinada de download, gerada só quando a pessoa clica em "Baixar"
// (validade curta: 5 min). Lê pelo client normal - a policy de SELECT do
// bucket é só pra authenticated, então quem não está logado nunca chega
// aqui nem no arquivo.
export async function getAudioDownloadUrl(activityId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("activities")
    .select("audio_path")
    .eq("id", activityId)
    .maybeSingle();

  const audioPath = activity?.audio_path as string | null | undefined;
  if (!audioPath) return { error: "Essa tarefa não tem áudio." };

  const ext = audioPath.split(".").pop() ?? "audio";
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(audioPath, 300, { download: `audio-do-solicitante.${ext}` });
  if (error || !data) return { error: "Não foi possível gerar o download. Tente novamente." };

  return { url: data.signedUrl };
}

export async function addComment(activityId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("activity_comments")
    .insert({ activity_id: activityId, author_id: user.id, body: trimmed });

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_comments").delete().eq("id", commentId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}
