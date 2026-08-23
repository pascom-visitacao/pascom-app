"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAssetLink(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const referenceLink = String(formData.get("reference_link") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !referenceLink) return;

  const supabase = await createClient();
  const { error } = await supabase.from("asset_links").insert({
    name,
    reference_link: referenceLink,
    notes: notes || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/acervo");
}

export async function updateAssetLink(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const referenceLink = String(formData.get("reference_link") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !referenceLink) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("asset_links")
    .update({ name, reference_link: referenceLink, notes: notes || null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/acervo");
}

export async function deleteAssetLink(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("asset_links").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/acervo");
}
