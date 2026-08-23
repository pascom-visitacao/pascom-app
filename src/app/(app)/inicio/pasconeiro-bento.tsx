import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function PasconeiroBento({
  supabase,
  userId,
  areaIds,
  areaName,
  roleLabel,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem tipos gerados do banco
  supabase: SupabaseClient<any>;
  userId: string;
  areaIds: string[];
  areaName: string;
  roleLabel: string;
}) {
  const [{ count: myPendingCount }, { count: myScheduleCount }, { count: openScheduleCount }] = await Promise.all([
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", userId)
      .neq("status", "concluido"),
    supabase
      .from("schedules")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("confirmed", true),
    areaIds.length > 0
      ? supabase
          .from("schedules")
          .select("id", { count: "exact", head: true })
          .in("area_id", areaIds)
          .is("user_id", null)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="bento" style={{ gridAutoRows: 160 }}>
      <Link href="/tarefas" className="bento-tile tile-minhas is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Minhas tarefas pendentes</div>
        <div className="tile-number">{myPendingCount ?? 0}</div>
        <div className="tile-sub">ainda não concluídas</div>
      </Link>

      <Link href="/agenda" className="bento-tile tile-escalas is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Minhas escalas confirmadas</div>
        <div className="tile-number">{myScheduleCount ?? 0}</div>
      </Link>

      <Link href="/agenda" className="bento-tile tile-vagas is-light">
        <div className="tile-arrow">→</div>
        <div className="tile-label">Vagas abertas nas minhas áreas</div>
        <div className="tile-number">{openScheduleCount ?? 0}</div>
      </Link>

      <div className="bento-tile is-light">
        <div className="tile-label">Meu perfil</div>
        <div className="tile-sub">
          <strong style={{ display: "block", marginBottom: 2, color: "var(--color-text)" }}>{areaName}</strong>
          {roleLabel}
        </div>
      </div>
    </div>
  );
}
