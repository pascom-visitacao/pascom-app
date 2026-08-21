"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createArea(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("areas").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/areas");
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");
  if (!name || !areaId) return;

  const supabase = await createClient();
  const { error } = await supabase.from("request_categories").insert({ name, area_id: areaId });
  if (error) throw new Error(error.message);

  revalidatePath("/areas");
}

export async function updateUserAssignment(
  userId: string,
  fields: { role?: "coordenacao_geral" | "pasconeiro"; area_id?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("users").update(fields).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/areas");
}
