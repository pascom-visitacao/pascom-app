import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "./event-form";
import { ScheduleForm } from "./schedule-form";
import { ScheduleRow, type ScheduleRowData } from "./schedule-row";
import { CalendarFileForm } from "./calendar-file-form";
import { addMonths, buildMonthGrid, monthParamString, parseMonthParam } from "./date-utils";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const VIEWS = [
  { key: "mes", label: "Mês" },
  { key: "semana", label: "Semana" },
  { key: "dia", label: "Dia" },
] as const;

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { view: viewParam, month: monthParam } = await searchParams;
  const view = VIEWS.some((v) => v.key === viewParam) ? viewParam! : "mes";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, area_id")
    .eq("id", user.id)
    .single();

  const isCoordenacao = profile?.role === "coordenacao_geral";

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");

  const { data: rawEvents } = await supabase
    .from("events")
    .select("id, title, date, location, description")
    .order("date", { ascending: true });

  const { data: rawSchedules } = await supabase
    .from("schedules")
    .select("id, event_id, role_needed, confirmed, area:areas(id, name), user:users(id, name)")
    .order("role_needed", { ascending: true });

  const schedulesByEvent = new Map<string, ScheduleRowData[]>();
  for (const s of rawSchedules ?? []) {
    const row: ScheduleRowData = {
      id: s.id,
      role_needed: s.role_needed,
      confirmed: s.confirmed,
      area: normalizeOne(s.area),
      user: normalizeOne(s.user),
    };
    const list = schedulesByEvent.get(s.event_id) ?? [];
    list.push(row);
    schedulesByEvent.set(s.event_id, list);
  }

  let calendarFiles: { id: string; period_type: string; reference_year: number; reference_month: number | null; url: string | null }[] = [];
  if (isCoordenacao) {
    const { data: rawFiles } = await supabase
      .from("parish_calendar_files")
      .select("id, period_type, reference_year, reference_month, file_path")
      .order("reference_year", { ascending: false })
      .order("reference_month", { ascending: false });

    calendarFiles = await Promise.all(
      (rawFiles ?? []).map(async (f) => {
        const { data } = await supabase.storage
          .from("calendario-paroquial")
          .createSignedUrl(f.file_path, 3600);
        return {
          id: f.id,
          period_type: f.period_type,
          reference_year: f.reference_year,
          reference_month: f.reference_month,
          url: data?.signedUrl ?? null,
        };
      }),
    );
  }

  const { year, month } = parseMonthParam(monthParam);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const grid = buildMonthGrid(year, month);
  const today = new Date();

  const eventsByDay = new Map<string, { id: string; title: string }[]>();
  for (const e of rawEvents ?? []) {
    const key = new Date(e.date).toDateString();
    const list = eventsByDay.get(key) ?? [];
    list.push({ id: e.id, title: e.title });
    eventsByDay.set(key, list);
  }

  const monthEvents = (rawEvents ?? []).filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const eventsToList = view === "mes" ? monthEvents : (rawEvents ?? []);

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 1000 }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-6)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Calendário</h1>
        {isCoordenacao && <EventForm />}
      </div>

      <div className="tabs" style={{ marginBottom: "var(--space-7)" }}>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/calendario?view=${v.key}${v.key === "mes" && monthParam ? `&month=${monthParam}` : ""}`}
            className={`tab-item${view === v.key ? " is-active" : ""}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {isCoordenacao && (
        <div className="card" style={{ padding: "var(--space-7)", marginBottom: "var(--space-8)" }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div>
              <div className="card-title" style={{ marginBottom: 0 }}>Referências do calendário paroquial</div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                PDF/foto que o padre envia — visível só pra você. Use pra criar os eventos acima manualmente.
              </p>
            </div>
            <CalendarFileForm />
          </div>

          {calendarFiles.length > 0 ? (
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              {calendarFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between"
                  style={{ padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }}
                >
                  <span>
                    {f.period_type === "anual"
                      ? `Anual — ${f.reference_year}`
                      : `${MONTH_NAMES[(f.reference_month ?? 1) - 1]} — ${f.reference_year}`}
                  </span>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      Ver arquivo
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
              Nenhuma referência enviada ainda.
            </span>
          )}
        </div>
      )}

      {view === "mes" && (
        <div className="card" style={{ padding: "var(--space-7)", marginBottom: "var(--space-8)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-5)" }}>
            <Link href={`/calendario?view=mes&month=${monthParamString(prev.year, prev.month)}`} className="btn btn-outline btn-sm">
              ← Anterior
            </Link>
            <div className="card-title" style={{ marginBottom: 0 }}>
              {MONTH_NAMES[month]} de {year}
            </div>
            <Link href={`/calendario?view=mes&month=${monthParamString(next.year, next.month)}`} className="btn btn-outline btn-sm">
              Próximo →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-2)" }}>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                style={{ textAlign: "center", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-subtle)", textTransform: "uppercase", paddingBottom: "var(--space-2)" }}
              >
                {label}
              </div>
            ))}
            {grid.map((day) => {
              const inMonth = day.getMonth() === month;
              const isToday = day.toDateString() === today.toDateString();
              const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    minHeight: 84,
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    background: isToday ? "var(--color-primary-subtle)" : "var(--color-bg-subtle)",
                    border: isToday ? "1.5px solid var(--color-primary)" : "1px solid transparent",
                    opacity: inMonth ? 1 : 0.4,
                  }}
                >
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-1)" }}>
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    {dayEvents.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        style={{
                          fontSize: "10px",
                          background: "var(--color-primary)",
                          color: "#fff",
                          borderRadius: "var(--radius-xs)",
                          padding: "1px 4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span style={{ fontSize: "10px", color: "var(--color-text-subtle)" }}>
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(view === "semana" || view === "dia") && (
        <div className="alert alert-info" style={{ marginBottom: "var(--space-8)" }}>
          <div>
            <div className="alert-title">Visão de {view === "semana" ? "semana" : "dia"} chegando em breve</div>
            Por enquanto, use a visão de Mês. A lista de eventos abaixo já mostra tudo.
          </div>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
        {eventsToList.map((event) => {
          const schedules = schedulesByEvent.get(event.id) ?? [];
          return (
            <div key={event.id} className="card" style={{ padding: "var(--space-7)" }}>
              <div className="card-title" style={{ fontSize: "var(--text-lg)" }}>
                {event.title}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                {new Date(event.date).toLocaleString("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
                {event.location && ` · ${event.location}`}
              </div>
              {event.description && (
                <p className="card-desc" style={{ marginBottom: "var(--space-5)" }}>
                  {event.description}
                </p>
              )}

              {schedules.length > 0 && (
                <div className="flex flex-col" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                  {schedules.map((schedule) => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      currentUserId={user.id}
                      isCoordenacao={isCoordenacao}
                      sameArea={schedule.area?.id === profile?.area_id}
                    />
                  ))}
                </div>
              )}

              {isCoordenacao && <ScheduleForm eventId={event.id} areas={areas ?? []} />}
            </div>
          );
        })}

        {eventsToList.length === 0 && (
          <div className="alert alert-info">
            <div>
              <div className="alert-title">
                {view === "mes" ? "Nenhum evento neste mês" : "Nenhum evento cadastrado"}
              </div>
              {isCoordenacao
                ? "Clique em “+ Novo evento” pra começar."
                : "A Coordenação geral ainda não cadastrou nenhum evento."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
