"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_FILES = 5;
// O client já comprime cada imagem antes de enviar (ver request-form.tsx);
// isso aqui é rede de segurança contra compressão que não pegou o alvo,
// ou alguém chamando a action direto sem passar pelo form. O que
// realmente importa é a SOMA, já que todos os arquivos vão juntos numa
// chamada só - o teto real é o corpo inteiro da function (~4,5MB na
// Vercel, ver next.config.ts).
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB por arquivo (sanidade)
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB somados, com margem
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function submitExternalRequest(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const requesterName = String(formData.get("requester_name") ?? "").trim();
  const requesterContact = String(formData.get("requester_contact") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  if (!categoryId || !description || !requesterName || !requesterContact) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const files = formData.getAll("attachments").filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (files.length > MAX_FILES) {
    return { error: `Envie no máximo ${MAX_FILES} imagens.` };
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: `"${file.name}" não é uma imagem aceita (use JPG, PNG, WEBP ou GIF).` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: `"${file.name}" passa de 3MB mesmo após compressão. Tente uma imagem menor.` };
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return { error: "As imagens juntas passam do limite. Envie menos imagens ou imagens menores." };
  }

  const supabase = await createClient();

  const attachmentUrls: string[] = [];
  for (const file of files) {
    const path = `${crypto.randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("pedidos-anexos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return { error: "Não foi possível enviar as imagens. Tente novamente." };
    }

    const { data: publicUrl } = supabase.storage.from("pedidos-anexos").getPublicUrl(path);
    attachmentUrls.push(publicUrl.publicUrl);
  }

  const { data, error } = await supabase.rpc("submit_external_request", {
    p_category_id: categoryId,
    p_description: description,
    p_requester_name: requesterName,
    p_requester_contact: requesterContact,
    p_deadline: deadline || null,
    p_event_id: eventId || null,
    p_attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
  });

  if (error) {
    return { error: "Não foi possível enviar o pedido. Tente novamente." };
  }

  return { token: data as string };
}
