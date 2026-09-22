"use server";

// Movido de areas/actions.ts na unificação de /areas em /equipe (visão
// condicional por papel, mesmo padrão do bento de /inicio) - RLS de
// areas/request_categories/users já restringe escrita à coordenação
// geral independente de qual página chama isso, então a unificação de
// rota não muda a superfície de segurança.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createArea(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("areas").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/equipe");
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");
  if (!name || !areaId) return;

  const supabase = await createClient();
  const { error } = await supabase.from("request_categories").insert({ name, area_id: areaId });
  if (error) throw new Error(error.message);

  revalidatePath("/equipe");
}

// Área não é editável por coordenação (autonomia do próprio Pasconeiro,
// via seleção própria - ver area-selection-actions.ts). Só role.
export async function updateUserRole(userId: string, role: "coordenacao_geral" | "pasconeiro") {
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/equipe");
}

// Contagem informativa pra confirmação antes de excluir - o soft-delete
// em si não toca nem apaga nenhuma dessas linhas (assignee_id/user_id
// continuam apontando pra essa pessoa, só account_status muda).
export async function getUserDeletionImpact(userId: string) {
  const supabase = await createClient();

  const [{ count: activityCount }, { count: scheduleCount }] = await Promise.all([
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("assignee_id", userId),
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return { activityCount: activityCount ?? 0, scheduleCount: scheduleCount ?? 0 };
}

// Soft-delete: NUNCA apaga a linha (preserva assignee_id/user_id/
// holder_id/author_id já referenciados, sem quebrar histórico nem
// reabrir tarefas/vagas como se estivessem sem dono). RLS + o trigger
// enforce_users_self_update já impedem isso numa conta de coordenação
// ou protegida - sem checagem extra aqui.
export async function softDeleteUser(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ account_status: "deleted" }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/equipe");
}
