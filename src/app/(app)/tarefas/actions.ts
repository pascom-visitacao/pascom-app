"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, activityAssignedEmail } from "@/lib/email";

export type ActivityStatus = "a_fazer" | "em_producao" | "revisao" | "concluido";
export type ActivityPriority = "baixa" | "media" | "alta";

export async function createActivity(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const priority = String(formData.get("priority") ?? "media") as ActivityPriority;
  const eventId = String(formData.get("event_id") ?? "");
  const parishMinistryId = String(formData.get("parish_ministry_id") ?? "");

  if (!title || !areaId) return;

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    title,
    description: description || null,
    area_id: areaId,
    assignee_id: assigneeId || null,
    due_date: dueDate || null,
    priority,
    event_id: eventId || null,
    parish_ministry_id: parishMinistryId || null,
  });

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

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
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
