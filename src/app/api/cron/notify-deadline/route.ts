import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, dueDateReminderEmail } from "@/lib/email";
import { checkCronAuth } from "@/lib/cron-auth";

// quantos dias antes do due_date o lembrete e disparado
const DAYS_AHEAD = 3;

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export async function GET(request: NextRequest) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + DAYS_AHEAD);
  const thresholdDate = threshold.toISOString().slice(0, 10);

  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, title, due_date, assignee:users(email)")
    .not("assignee_id", "is", null)
    .not("due_date", "is", null)
    .lte("due_date", thresholdDate)
    .is("due_date_reminder_sent_at", null)
    .neq("status", "concluido");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const activity of activities ?? []) {
    const assignee = normalizeOne<{ email: string }>(activity.assignee);

    if (assignee?.email) {
      await sendEmail({
        to: [assignee.email],
        subject: `Prazo se aproximando: ${activity.title}`,
        html: dueDateReminderEmail(activity.title, activity.due_date as string),
      });
      sent++;
    }

    await supabase
      .from("activities")
      .update({ due_date_reminder_sent_at: new Date().toISOString() })
      .eq("id", activity.id);
  }

  return NextResponse.json({ checked: activities?.length ?? 0, sent });
}
