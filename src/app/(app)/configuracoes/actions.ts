"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSocialMediaAccount(formData: FormData) {
  const platformName = String(formData.get("platform_name") ?? "").trim();
  const referenceLink = String(formData.get("reference_link") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!platformName || !referenceLink) return;

  const supabase = await createClient();
  const { error } = await supabase.from("social_media_accounts").insert({
    platform_name: platformName,
    reference_link: referenceLink,
    notes: notes || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}

export async function deleteSocialMediaAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("social_media_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}
