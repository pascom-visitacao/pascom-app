"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export async function createEquipment(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const photo = formData.get("photo");

  if (!name) return { error: "Informe o nome do equipamento." };

  const supabase = await createClient();
  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Envie JPG, PNG ou WEBP." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "A foto passa de 5MB." };
    }

    const ext = photo.type.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("equipamentos-fotos")
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      return { error: "Não foi possível enviar a foto." };
    }

    photoUrl = supabase.storage.from("equipamentos-fotos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("equipment")
    .insert({ name, model: model || null, photo_url: photoUrl });

  if (error) throw new Error(error.message);

  revalidatePath("/equipamentos");
  return {};
}

export async function takeEquipment(equipmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("equipment").update({ holder_id: user.id }).eq("id", equipmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/equipamentos");
}

export async function returnEquipment(equipmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").update({ holder_id: null }).eq("id", equipmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/equipamentos");
}
