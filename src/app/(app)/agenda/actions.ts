"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google-calendar";

export type EventColor = "verde" | "azul" | "ambar" | "vermelho" | "neutro";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "azul") as EventColor;

  if (!title || !date) return;

  const eventData = {
    title,
    date: new Date(date).toISOString(),
    location: location || null,
    description: description || null,
    color,
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

// Edição/exclusão de evento não sincroniza com o Google Calendar de
// propósito (mesma decisão de adiamento já registrada em
// lib/google-calendar.ts pra Etapa 1) - o evento lá fica órfão/desatualizado
// até uma Etapa 2 cuidar disso.
export async function updateEvent(eventId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "azul") as EventColor;

  if (!title || !date) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title,
      date: new Date(date).toISOString(),
      location: location || null,
      description: description || null,
      color,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

// Chamado antes da confirmação de exclusão, pra mostrar quantas vagas e
// atividades serão afetadas. schedules.event_id é "on delete cascade"
// (excluídas junto) e activities.event_id é "on delete set null" (só
// desvincula) - contagens só informativas, o próprio banco já garante
// esse comportamento na hora do delete.
export async function getEventDeletionImpact(eventId: string) {
  const supabase = await createClient();

  const [{ count: scheduleCount }, { count: activityCount }] = await Promise.all([
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  return { scheduleCount: scheduleCount ?? 0, activityCount: activityCount ?? 0 };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw new Error(error.message);

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

// Distinta de releaseSchedule (libera a vaga, continua existindo) - essa
// remove a vaga em si. RLS já restringe a coordenação (mesmo padrão de
// "schedules: exclusão só coordenação"); a confirmação de vaga já
// assumida é responsabilidade da UI (ScheduleRow), não daqui.
export async function deleteSchedule(scheduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);

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
    console.error("Falha ao enviar arquivo do calendário paroquial", { path, userId: user.id, uploadError });
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
