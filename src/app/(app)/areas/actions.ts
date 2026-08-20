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

export async function updateUserAssignment(
  userId: string,
  fields: { role?: "coordenacao_geral" | "pasconeiro"; area_id?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("users").update(fields).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/areas");
}
