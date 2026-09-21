import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser, getSupabase } from "@/lib/supabase/request";
import { EquipmentCard, type EquipmentData } from "./equipment-card";
import { NewEquipmentForm } from "./new-equipment-form";

function normalizeOne<T>(raw: unknown): T | null {
  if (!raw) return null;
  return (Array.isArray(raw) ? (raw[0] ?? null) : raw) as T | null;
}

export default async function EquipamentosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const [profile, { data: rawEquipment }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("equipment")
      .select("id, name, model, photo_url, holder:users(id, name, avatar_url, account_status)")
      .order("name"),
  ]);
  const isCoordenacao = profile?.role === "coordenacao_geral";

  const equipment: EquipmentData[] = (rawEquipment ?? []).map((e) => ({
    ...e,
    holder: normalizeOne(e.holder),
  }));

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Equipamentos</h1>

      {isCoordenacao && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <NewEquipmentForm />
        </div>
      )}

      <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
        {equipment.map((item) => (
          <EquipmentCard key={item.id} equipment={item} currentUserId={user.id} isCoordenacao={isCoordenacao} />
        ))}
        {equipment.length === 0 && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhum equipamento cadastrado ainda.
          </span>
        )}
      </div>
    </div>
  );
}
