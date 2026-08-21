"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !date) return;

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    title,
    date: new Date(date).toISOString(),
    location: location || null,
    description: description || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/calendario");
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

  revalidatePath("/calendario");
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

  revalidatePath("/calendario");
}

export async function releaseSchedule(scheduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .update({ user_id: null, confirmed: false })
    .eq("id", scheduleId);

  if (error) throw new Error(error.message);

  revalidatePath("/calendario");
}
