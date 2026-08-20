import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createArea } from "./actions";
import { UserAssignmentRow } from "./user-assignment-row";

export default async function AreasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coordenacao_geral") {
    redirect("/dashboard");
  }

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, area_id")
    .order("name");

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Equipe &amp; Áreas</h1>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Áreas</h2>

        <div className="flex flex-wrap" style={{ gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {(areas ?? []).map((area) => (
            <span key={area.id} className="badge badge-neutral">
              {area.name}
            </span>
          ))}
          {(areas ?? []).length === 0 && (
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Nenhuma área cadastrada ainda.
            </span>
          )}
        </div>

        <form action={createArea} className="flex items-end" style={{ gap: "var(--space-3)" }}>
          <div className="field" style={{ maxWidth: 240 }}>
            <label className="field-label">Nova área</label>
            <div className="input-wrap">
              <input type="text" name="name" placeholder="Ex: Redes sociais" required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-md">
            Criar
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Equipe</h2>

        <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
          {(users ?? []).map((member) => (
            <div
              key={member.id}
              className="card flex items-center justify-between flex-wrap"
              style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
            >
              <div>
                <div style={{ fontWeight: "var(--weight-semibold)" }}>{member.name}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  {member.email}
                </div>
              </div>
              <UserAssignmentRow
                userId={member.id}
                role={member.role}
                areaId={member.area_id}
                areas={areas ?? []}
                disableSelf={member.id === user.id}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
