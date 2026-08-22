// Roda 1x/dia via Vercel Cron nativo (vercel.json). Cobre 2 gatilhos de
// notificação, agrupados aqui pra não depender de um segundo cron job
// (o plano atual da Vercel só tem 1 configurado):
// 1. notifyDeadlines - prazo de atividade se aproximando (função
//    original desta rota).
// 2. notifyScheduleReminders (Fase 4.6) - lembrete de escala confirmada
//    na véspera do evento.
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, dueDateReminderEmail, scheduleReminderEmail } from "@/lib/email";
import { checkCronAuth } from "@/lib/cron-auth";

// quantos dias antes do due_date o lembrete e disparado
const DAYS_AHEAD = 3;

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

async function notifyDeadlines(supabase: ReturnType<typeof createServiceRoleClient>) {
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
    console.error(error);
    return { checked: 0, sent: 0 };
  }

  let sent = 0;
  for (const activity of activities ?? []) {
    const assignee = normalizeOne<{ email: string }>(activity.assignee);
    let delivered = true;

    if (assignee?.email) {
      try {
        await sendEmail({
          to: [assignee.email],
          subject: `Prazo se aproximando: ${activity.title}`,
          html: dueDateReminderEmail(activity.title, activity.due_date as string),
        });
        sent++;
      } catch (sendError) {
        // Falha na CONSTRUÇÃO do cliente do Resend (ex: chave ausente)
        // não é capturada dentro de sendEmail - sem esse try/catch aqui,
        // um erro derrubava o loop inteiro e as atividades seguintes
        // nunca eram processadas nesse dia.
        delivered = false;
        console.error("Falha ao enviar lembrete de prazo", { activityId: activity.id, sendError });
      }
    }

    // Só marca como enviado se realmente entregou (ou não tinha pra
    // quem mandar) - numa falha real, o próximo cron tenta de novo.
    if (delivered) {
      await supabase
        .from("activities")
        .update({ due_date_reminder_sent_at: new Date().toISOString() })
        .eq("id", activity.id);
    }
  }

  return { checked: activities?.length ?? 0, sent };
}

// "Amanhã" calculado no fuso de Brasília (UTC-3, sem horário de verão -
// mesma aproximação já usada no greeting() do dashboard), não em UTC
// puro, senão o lembrete dispararia na data errada perto da virada do dia.
async function notifyScheduleReminders(supabase: ReturnType<typeof createServiceRoleClient>) {
  const nowBrasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const tomorrow = new Date(nowBrasilia);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const y = tomorrow.getUTCFullYear();
  const m = tomorrow.getUTCMonth();
  const d = tomorrow.getUTCDate();

  const rangeStart = new Date(Date.UTC(y, m, d, 3, 0, 0)); // 00:00 em Brasília
  const rangeEnd = new Date(Date.UTC(y, m, d + 1, 3, 0, 0));

  const { data: tomorrowEvents } = await supabase
    .from("events")
    .select("id, title, date")
    .gte("date", rangeStart.toISOString())
    .lt("date", rangeEnd.toISOString());

  const eventById = new Map((tomorrowEvents ?? []).map((e) => [e.id, e]));
  const eventIds = [...eventById.keys()];

  if (eventIds.length === 0) return { checked: 0, sent: 0 };

  const { data: schedules, error } = await supabase
    .from("schedules")
    .select("id, event_id, role_needed, user:users(email)")
    .in("event_id", eventIds)
    .eq("confirmed", true)
    .not("user_id", "is", null)
    .is("reminder_sent_at", null);

  if (error) {
    console.error(error);
    return { checked: 0, sent: 0 };
  }

  let sent = 0;
  for (const schedule of schedules ?? []) {
    const user = normalizeOne<{ email: string }>(schedule.user);
    const event = eventById.get(schedule.event_id);
    let delivered = true;

    if (user?.email && event) {
      try {
        await sendEmail({
          to: [user.email],
          subject: `Lembrete: escala amanhã — ${event.title}`,
          html: scheduleReminderEmail(schedule.role_needed, event.title, event.date),
        });
        sent++;
      } catch (sendError) {
        delivered = false;
        console.error("Falha ao enviar lembrete de escala", { scheduleId: schedule.id, sendError });
      }
    }

    if (delivered) {
      await supabase
        .from("schedules")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", schedule.id);
    }
  }

  return { checked: schedules?.length ?? 0, sent };
}

export async function GET(request: NextRequest) {
  const unauthorized = checkCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createServiceRoleClient();

    const deadlines = await notifyDeadlines(supabase);
    const scheduleReminders = await notifyScheduleReminders(supabase);

    return NextResponse.json({ deadlines, scheduleReminders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
