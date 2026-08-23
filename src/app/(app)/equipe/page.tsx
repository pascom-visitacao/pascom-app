import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectiveAreaIds } from "@/lib/effective-areas";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function EquipePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: areas } = await supabase.from("areas").select("id, name").order("name");
  const areaNameById = new Map((areas ?? []).map((a) => [a.id, a.name]));

  // is_protected marca a conta institucional (pascomvisitacao@gmail.com) -
  // não é uma pessoa real da equipe, não deve aparecer aqui. Inclui os
  // dois papéis (pasconeiro e coordenacao_geral), diferente da query
  // antiga que filtrava só pasconeiro.
  const { data: members } = await supabase
    .from("users")
    .select("id, name, role, avatar_url, area_ids, pending_area_ids, areas_submitted_at")
    .eq("is_protected", false)
    .order("name");

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 720 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>Equipe</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-7)" }}>
        Quem faz parte da Pascom e em quais áreas atua.
      </p>

      <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
        {(members ?? []).map((p) => {
          const areaNames = effectiveAreaIds(p)
            .map((id) => areaNameById.get(id))
            .filter((name): name is string => Boolean(name));

          return (
            <div
              key={p.id}
              className="card flex items-center"
              style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
            >
              {p.avatar_url ? (
                <Image
                  src={p.avatar_url}
                  alt={p.name}
                  width={48}
                  height={48}
                  className="avatar-photo"
                  style={{ width: 48, height: 48 }}
                />
              ) : (
                <span className="avatar avatar-md">{initials(p.name)}</span>
              )}
              <div>
                <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)" }}>{p.name}</span>
                  {p.role === "coordenacao_geral" && (
                    <span className="badge badge-primary">Coordenação geral</span>
                  )}
                </div>
                <div className="flex flex-wrap" style={{ gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                  {areaNames.length > 0 ? (
                    areaNames.map((name) => (
                      <span key={name} className="badge badge-neutral">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-subtle)" }}>
                      Sem área definida ainda
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(members ?? []).length === 0 && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhum membro cadastrado ainda.
          </span>
        )}
      </div>
    </div>
  );
}
