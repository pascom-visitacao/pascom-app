import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "./event-form";
import { ScheduleForm } from "./schedule-form";
import { ScheduleRow, type ScheduleRowData } from "./schedule-row";
import { CalendarFileForm } from "./calendar-file-form";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export default async function CalendarioPage() {
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

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Calendário</h1>
        {isCoordenacao && <EventForm />}
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

      <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
        {(rawEvents ?? []).map((event) => {
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

        {(rawEvents ?? []).length === 0 && (
          <div className="alert alert-info">
            <div>
              <div className="alert-title">Nenhum evento cadastrado</div>
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
