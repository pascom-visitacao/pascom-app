"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google-calendar";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !date) return;

  const eventData = {
    title,
    date: new Date(date).toISOString(),
    location: location || null,
    description: description || null,
  };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase.from("events").insert(eventData).select("id").single();

  if (error) throw new Error(error.message);

  // Sincronização com Google Calendar é best-effort: o evento já está
  // criado no app de qualquer forma, uma instabilidade do Google não pode
  // travar o fluxo da Coordenação.
  try {
    const calendarEvent = await createCalendarEvent(eventData);
    await supabase.from("events").update({ google_calendar_event_id: calendarEvent.id }).eq("id", inserted.id);
  } catch (syncError) {
    console.error("Falha ao sincronizar evento com o Google Calendar", { eventId: inserted.id, syncError });
  }

  revalidatePath("/agenda");
}

export async function createSchedule(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "");
  const roleNeeded = String(formData.get("role_needed") ?? "").trim();
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));

  if (!eventId || !areaId || !roleNeeded) return;

  const supabase = await createClient();
  const rows = Array.from({ length: quantity }, () => ({
    event_id: eventId,
    area_id: areaId,
    role_needed: roleNeeded,
  }));

  const { error } = await supabase.from("schedules").insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

export async function assumeSchedule(scheduleId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("schedules")
    .update({ user_id: user.id, confirmed: true })
    .eq("id", scheduleId);

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

export async function releaseSchedule(scheduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .update({ user_id: null, confirmed: false })
    .eq("id", scheduleId);

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

const ALLOWED_CALENDAR_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_CALENDAR_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadCalendarFile(formData: FormData) {
  const periodType = String(formData.get("period_type") ?? "");
  const referenceYear = Number(formData.get("reference_year") ?? 0);
  const referenceMonthRaw = String(formData.get("reference_month") ?? "");
  const referenceMonth = referenceMonthRaw ? Number(referenceMonthRaw) : null;
  const file = formData.get("file");

  if (periodType !== "anual" && periodType !== "mensal") {
    return { error: "Escolha o tipo do documento." };
  }
  if (!referenceYear) {
    return { error: "Informe o ano." };
  }
  if (periodType === "mensal" && !referenceMonth) {
    return { error: "Informe o mês." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (!ALLOWED_CALENDAR_TYPES.includes(file.type)) {
    return { error: "Envie PDF, JPG, PNG ou WEBP." };
  }
  if (file.size > MAX_CALENDAR_FILE_SIZE) {
    return { error: "O arquivo passa de 20MB." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const path = `${crypto.randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from("calendario-paroquial")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo." };
  }

  const { error } = await supabase.from("parish_calendar_files").insert({
    period_type: periodType,
    reference_year: referenceYear,
    reference_month: periodType === "mensal" ? referenceMonth : null,
    file_path: path,
    uploaded_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  return {};
}
