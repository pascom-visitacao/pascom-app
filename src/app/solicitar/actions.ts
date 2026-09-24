"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_FILES = 5;
// O client já comprime cada imagem antes de enviar (ver request-form.tsx);
// isso aqui é rede de segurança contra compressão que não pegou o alvo,
// ou alguém chamando a action direto sem passar pelo form. O que
// realmente importa é a SOMA, já que todos os arquivos vão juntos numa
// chamada só - o teto real é o corpo inteiro da function (~4,5MB na
// Vercel, ver next.config.ts).
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB por arquivo (sanidade)
// Teto do corpo inteiro (imagens + áudio somados), com margem sob os
// ~4,5MB da Vercel. Com áudio, o client mira 1,5MB pras imagens e o áudio
// chega a 2,5MB - a soma cabe aqui.
const MAX_TOTAL_SIZE = 4 * 1024 * 1024;
const MAX_AUDIO_SIZE = 2.5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const AUDIO_EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
};

// MediaRecorder devolve "audio/webm;codecs=opus" - o que vale pra
// validação e pro Storage é o tipo base.
function baseMimeType(type: string) {
  return type.split(";")[0].trim().toLowerCase();
}

const GENERIC_ERROR = "Não foi possível enviar o pedido. Tente novamente.";

export async function submitExternalRequest(formData: FormData) {
  // Honeypot: campo oculto no form (ver request-form.tsx) que pessoa
  // nenhuma preenche. Bot que preenche tudo cai aqui - mesma mensagem
  // genérica de falha, pra não ensinar o que foi detectado.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { error: GENERIC_ERROR };
  }

  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const requesterName = String(formData.get("requester_name") ?? "").trim();
  const requesterContact = String(formData.get("requester_contact") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  const audioEntry = formData.get("audio");
  const audio = audioEntry instanceof File && audioEntry.size > 0 ? audioEntry : null;

  // Com áudio, a descrição deixa de ser obrigatória (quem prefere falar
  // não precisa digitar). Sem áudio, a regra de sempre continua.
  if (!categoryId || (!description && !audio) || !requesterName || !requesterContact) {
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

  let audioType = "";
  let audioDuration: number | null = null;
  if (audio) {
    audioType = baseMimeType(audio.type);
    if (!AUDIO_EXTENSION_BY_TYPE[audioType]) {
      return { error: "Formato de áudio não aceito. Envie um áudio (.mp3, .m4a, .ogg, .webm, .wav)." };
    }
    if (audio.size > MAX_AUDIO_SIZE) {
      return { error: "Esse áudio passou de 2,5 MB. Tente um mais curto." };
    }
    // Duração vem do cronômetro do navegador, só pra exibir - nunca
    // confiar nela pra nada além disso. Fora da faixa, descarta.
    const rawDuration = Number(formData.get("audio_duration_seconds"));
    if (Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 600) {
      audioDuration = Math.round(rawDuration);
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0) + (audio?.size ?? 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      error: audio
        ? "Áudio e imagens juntos passam do limite. Envie menos imagens, imagens menores ou um áudio mais curto."
        : "As imagens juntas passam do limite. Envie menos imagens ou imagens menores.",
    };
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

  // Áudio: bucket privado sem nenhuma policy pra anon - o upload é
  // sempre daqui, com a service role. Caminho é só {uuid}.{ext}, gerado
  // no servidor: nada nele identifica o solicitante.
  let audioPath: string | null = null;
  const admin = audio ? createServiceRoleClient() : null;
  if (audio && admin) {
    audioPath = `${crypto.randomUUID()}.${AUDIO_EXTENSION_BY_TYPE[audioType]}`;
    const { error: audioUploadError } = await admin.storage
      .from("request-audios")
      .upload(audioPath, audio, { contentType: audioType });

    if (audioUploadError) {
      return { error: "Não foi possível enviar o áudio. Tente novamente." };
    }
  }

  const { data, error } = await supabase.rpc("submit_external_request", {
    p_category_id: categoryId,
    // description é not null no banco: pedido só com áudio vai vazio.
    p_description: description,
    p_requester_name: requesterName,
    p_requester_contact: requesterContact,
    p_deadline: deadline || null,
    p_event_id: eventId || null,
    p_attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
    p_audio_path: audioPath,
    p_audio_mime: audio ? audioType : null,
    p_audio_duration_seconds: audioDuration,
  });

  if (error) {
    // O arquivo já subiu mas o pedido não foi criado: apaga antes de
    // devolver o erro, senão fica órfão sem nenhuma linha apontando pra
    // ele (spec-audio-pedidos.md, seção 7.3).
    if (audioPath && admin) {
      await admin.storage.from("request-audios").remove([audioPath]);
    }
    return { error: GENERIC_ERROR };
  }

  return { token: data as string, hasAudio: audioPath !== null };
}
