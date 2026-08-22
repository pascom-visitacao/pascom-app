"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Margem abaixo do teto de ~4,5MB da Vercel pro corpo de uma Server
// Action (ver next.config.ts) - sobra espaço pro resto do formulário.
const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

function splitLines(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const skills = splitLines(formData.get("skills"));
  const socialLinks = splitLines(formData.get("social_links"));
  const photo = formData.get("photo");

  if (!name) return { error: "Informe seu nome." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const update: Record<string, unknown> = {
    name,
    phone: phone || null,
    bio: bio || null,
    skills,
    social_links: socialLinks,
  };

  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Envie JPG, PNG ou WEBP." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "A foto passa de 4MB." };
    }

    const ext = photo.type.split("/")[1];
    const path = `${user.id}/foto.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("perfil-fotos")
      .upload(path, photo, { contentType: photo.type, upsert: true });

    if (uploadError) {
      console.error("upload error", { path, userId: user.id, uploadError });
      return { error: "Não foi possível enviar a foto." };
    }

    update.avatar_url = supabase.storage.from("perfil-fotos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("users").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return {};
}
