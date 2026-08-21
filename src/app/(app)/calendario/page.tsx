import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "./event-form";
import { ScheduleForm } from "./schedule-form";
import { ScheduleRow, type ScheduleRowData } from "./schedule-row";

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

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-7)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Calendário</h1>
        {isCoordenacao && <EventForm />}
      </div>

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
