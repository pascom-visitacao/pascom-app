"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  revalidatePath("/atividades");
}

export async function updateActivityStatus(activityId: string, status: ActivityStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .update({ status })
    .eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/atividades");
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

  revalidatePath("/atividades");
}

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/atividades");
}
