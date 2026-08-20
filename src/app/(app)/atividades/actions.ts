"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActivityStatus = "a_fazer" | "em_producao" | "revisao" | "concluido";

export async function createActivity(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");

  if (!title || !areaId) return;

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    title,
    description: description || null,
    area_id: areaId,
    assignee_id: assigneeId || null,
    due_date: dueDate || null,
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

export async function deleteActivity(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);

  if (error) throw new Error(error.message);

  revalidatePath("/atividades");
}
