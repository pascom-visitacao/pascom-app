"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitAreaSelection(areaIds: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_area_selection", { new_area_ids: areaIds });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
