import { HandHeart } from "lucide-react";
import { Icon } from "@/components/icon";
import { getSupabase } from "@/lib/supabase/request";
import { FIXED_ENTRY_WEIGHT, pickDailyEntry, saoPauloDateKey, type PrayerEntry } from "@/lib/daily-prayer";

export async function PrayerCard({ currentUserId }: { currentUserId: string }) {
  const supabase = await getSupabase();

  // is_protected = conta institucional, não é uma pessoa pra rezar por.
  const [{ data: users }, { data: ministries }, { data: fixed }] = await Promise.all([
    supabase.from("users").select("id, name").eq("account_status", "active").eq("is_protected", false),
    supabase.from("parish_ministries").select("id, name"),
    supabase.from("prayer_fixed_entries").select("id, name"),
  ]);

  const entries: PrayerEntry[] = [
    ...(users ?? []).map((u) => ({ key: `user:${u.id}`, label: u.name, weight: 1, userId: u.id })),
    ...(ministries ?? []).map((m) => ({ key: `ministry:${m.id}`, label: m.name, weight: 1 })),
    ...(fixed ?? []).map((f) => ({ key: `fixed:${f.id}`, label: f.name, weight: FIXED_ENTRY_WEIGHT })),
  ].sort((a, b) => a.key.localeCompare(b.key));

  const picked = pickDailyEntry(saoPauloDateKey(), entries);
  if (!picked) return null;

  const label = picked.userId === currentUserId ? "você" : picked.label;

  return (
    <div
      className="card flex items-center"
      style={{ padding: "var(--space-5)", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: "var(--radius-full)",
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon icon={HandHeart} size={20} />
      </span>
      <p style={{ margin: 0 }}>
        Hoje minha intenção do dia é para: <strong>{label}</strong>
      </p>
    </div>
  );
}
