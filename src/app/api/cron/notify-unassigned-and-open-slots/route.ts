import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, unassignedActivitiesEmail, openSchedulesEmail } from "@/lib/email";
import { checkCronAuth } from "@/lib/cron-auth";
import { effectiveAreaIds } from "@/lib/effective-areas";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

async function pasconeiroEmails(supabase: ServiceRoleClient, areaId: string): Promise<string[]> {
  // sem sessão de usuário (roda como service_role), não dá pra chamar
  // my_area_ids() - busca as colunas cruas e calcula o conjunto vigente
  // em TS, mesma lógica de effective_area_ids().
  const { data } = await supabase
    .from("users")
    .select("email, area_ids, pending_area_ids, areas_submitted_at")
    .eq("role", "pasconeiro");
  return (data ?? []).filter((u) => effectiveAreaIds(u).includes(areaId)).map((u) => u.email);
}

async function notifyUnassignedActivities(supabase: ServiceRoleClient) {
  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, area_id, area:areas(name)")
    .is("assignee_id", null)
    .is("unassigned_notified_at", null);

  const byArea = new Map<string, { name: string; items: { id: string; title: string }[] }>();
  for (const a of activities ?? []) {
    const area = normalizeOne<{ name: string }>(a.area);
    const entry = byArea.get(a.area_id) ?? { name: area?.name ?? "—", items: [] };
    entry.items.push({ id: a.id, title: a.title });
    byArea.set(a.area_id, entry);
  }

  let sent = 0;
  for (const [areaId, { name, items }] of byArea) {
    const emails = await pasconeiroEmails(supabase, areaId);
    await sendEmail({
      to: emails,
      subject: `${items.length} atividade(s) sem responsável — ${name}`,
      html: unassignedActivitiesEmail(items, name),
    });

    await supabase
      .from("activities")
      .update({ unassigned_notified_at: new Date().toISOString() })
      .in(
        "id",
        items.map((i) => i.id),
      );
    sent += items.length;
  }

  return sent;
}

async function notifyOpenSchedules(supabase: ServiceRoleClient) {
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, role_needed, area_id, event_id, area:areas(name), event:events(title)")
    .is("user_id", null)
    .is("open_notified_at", null);

  const byAreaEvent = new Map<
    string,
    { areaId: string; areaName: string; eventTitle: string; items: { id: string; role_needed: string }[] }
  >();
  for (const s of schedules ?? []) {
    const area = normalizeOne<{ name: string }>(s.area);
    const event = normalizeOne<{ title: string }>(s.event);
    const key = `${s.area_id}:${s.event_id}`;
    const entry: { areaId: string; areaName: string; eventTitle: string; items: { id: string; role_needed: string }[] } =
      byAreaEvent.get(key) ??
      { areaId: s.area_id, areaName: area?.name ?? "—", eventTitle: event?.title ?? "—", items: [] };
    entry.items.push({ id: s.id, role_needed: s.role_needed });
    byAreaEvent.set(key, entry);
  }

  let sent = 0;
  for (const { areaId, areaName, eventTitle, items } of byAreaEvent.values()) {
    const emails = await pasconeiroEmails(supabase, areaId);
    await sendEmail({
      to: emails,
      subject: `${items.length} vaga(s) aberta(s) — ${areaName}`,
      html: openSchedulesEmail(items, areaName, eventTitle),
    });

    await supabase
      .from("schedules")
      .update({ open_notified_at: new Date().toISOString() })
      .in(
        "id",
        items.map((i) => i.id),
      );
    sent += items.length;
  }

  return sent;
}

export async function GET(request: NextRequest) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  const unassignedSent = await notifyUnassignedActivities(supabase);
  const openSlotsSent = await notifyOpenSchedules(supabase);

  return NextResponse.json({ unassignedSent, openSlotsSent });
}
