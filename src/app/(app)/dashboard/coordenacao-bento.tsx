import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

const STATUS_LABELS: Record<string, string> = {
  a_fazer: "Recebido",
  em_producao: "Em produção",
  revisao: "Em revisão",
  concluido: "Concluído",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // semana começa na segunda
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem tipos gerados do banco
export async function CoordenacaoBento({ supabase }: { supabase: SupabaseClient<any> }) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    { data: rawRequests },
    { data: eventsThisWeek },
    { count: unassignedCount },
    { data: nextEvent },
    { data: pasconeiros },
    { data: concludedThisWeek },
    { data: openSchedules },
  ] = await Promise.all([
    supabase
      .from("external_requests")
      .select("id, requester_name, status, activity:activities(status)")
      .neq("status", "cancelado")
      .order("created_at", { ascending: false }),
    supabase.from("events").select("date").gte("date", weekStart.toISOString()).lt("date", weekEnd.toISOString()),
    supabase.from("activities").select("id", { count: "exact", head: true }).is("assignee_id", null),
    supabase
      .from("events")
      .select("id, title, date")
      .gte("date", now.toISOString())
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("users").select("id, name, area_id").eq("role", "pasconeiro"),
    supabase
      .from("activities")
      .select("updated_at")
      .eq("status", "concluido")
      .gte("updated_at", weekStart.toISOString()),
    supabase.from("schedules").select("id, event_id").is("user_id", null),
  ]);

  const pending = (rawRequests ?? []).filter((r) => {
    const activity = normalizeOne<{ status: string }>(r.activity);
    return !activity || activity.status !== "concluido";
  });

  const eventDays = new Set((eventsThisWeek ?? []).map((e) => new Date(e.date).toDateString()));

  const teamAreas = new Set((pasconeiros ?? []).filter((p) => p.area_id).map((p) => p.area_id));

  const concludedByDay = [0, 0, 0, 0, 0, 0, 0];
  for (const a of concludedThisWeek ?? []) {
    const idx = Math.floor((new Date(a.updated_at).getTime() - weekStart.getTime()) / 86400000);
    if (idx >= 0 && idx < 7) concludedByDay[idx] += 1;
  }
  const maxConcluded = Math.max(1, ...concludedByDay);

  const openEventIds = new Set((openSchedules ?? []).map((s) => s.event_id));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="bento">
      <Link href="/solicitar" target="_blank" className="bento-tile tile-pedidos">
        <div className="tile-label">Pedidos externos pendentes</div>
        <div className="tile-number">{pending.length}</div>
        <div className="tile-list">
          {pending.slice(0, 2).map((r) => {
            const activity = normalizeOne<{ status: string }>(r.activity);
            const label = activity ? STATUS_LABELS[activity.status] ?? activity.status : "Recebido";
            return (
              <div key={r.id} className="tile-list-item">
                <span>{r.requester_name}</span>
                <span className="badge">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="tile-cta">Ver formulário público →</div>
      </Link>

      <div className="bento-tile tile-semana is-light">
        <div className="tile-label">Esta semana</div>
        <div className="week-row">
          {weekDays.map((d) => {
            const isToday = d.toDateString() === now.toDateString();
            const hasEvent = eventDays.has(d.toDateString());
            return (
              <div key={d.toISOString()} className={`day-pill${isToday ? " is-today" : ""}${hasEvent ? " has-event" : ""}`}>
                <span className="num">{d.getDate()}</span>
                <span className="dow">{WEEKDAY_LABELS[d.getDay()]}</span>
                <span className="dot" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bento-tile tile-atrasadas">
        <div className="tile-label">Sem responsável</div>
        <div className="tile-number">{unassignedCount ?? 0}</div>
        <div className="tile-sub">atividades</div>
      </div>

      <Link href="/calendario" className="bento-tile tile-evento is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Próximo evento</div>
        {nextEvent ? (
          <div className="tile-sub">
            <strong>{nextEvent.title}</strong>
            {new Date(nextEvent.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </div>
        ) : (
          <div className="tile-sub">Nenhum evento agendado</div>
        )}
      </Link>

      <Link href="/areas" className="bento-tile tile-equipe is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Equipe</div>
        <div className="tile-row">
          <div className="tile-number">{pasconeiros?.length ?? 0}</div>
          <div className="tile-sub">Pasconeiros em {teamAreas.size} áreas</div>
        </div>
        <div className="avatars">
          {(pasconeiros ?? []).slice(0, 3).map((p) => (
            <span key={p.id} className="avatar avatar-sm">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {(pasconeiros?.length ?? 0) > 3 && (
            <span className="avatar avatar-sm">+{(pasconeiros?.length ?? 0) - 3}</span>
          )}
        </div>
      </Link>

      <div className="bento-tile tile-concluidas is-light">
        <div className="tile-label">Concluídas na semana</div>
        <div className="tile-number">{concludedThisWeek?.length ?? 0}</div>
        <div className="mini-chart">
          {concludedByDay.map((count, i) => (
            <span key={i} style={{ height: `${Math.max(8, (count / maxConcluded) * 100)}%` }} />
          ))}
        </div>
      </div>

      <Link href="/calendario" className="bento-tile tile-vagas is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Vagas abertas</div>
        <div className="tile-number">{openSchedules?.length ?? 0}</div>
        <div className="tile-sub">em {openEventIds.size} eventos</div>
      </Link>
    </div>
  );
}
