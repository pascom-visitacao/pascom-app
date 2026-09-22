import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser, getSupabase } from "@/lib/supabase/request";
import { effectiveAreaIds } from "@/lib/effective-areas";
import { createArea, createCategory } from "./actions";
import { UserAssignmentRow } from "./user-assignment-row";
import { DeleteUserButton } from "./delete-user-button";
import "./areas.css";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function areaName(raw: unknown): string {
  const area = Array.isArray(raw) ? raw[0] : raw;
  return (area as { name?: string } | null)?.name ?? "—";
}

// Uma rota só pra "Equipe", conteúdo condicional por papel - mesmo
// padrão já usado no bento de /inicio (PasconeiroBento vs
// CoordenacaoBento). Antes eram duas páginas separadas (/equipe,
// somente leitura pra todo mundo, e /areas, gestão completa só pra
// coordenação) - unificadas aqui porque a segunda era estritamente um
// superconjunto da primeira pra quem podia acessá-la. RLS de
// areas/request_categories/users (ver actions.ts) já restringe escrita
// à coordenação geral independente de rota - o `if (isCoordenacao)`
// abaixo é só sobre o que a TELA mostra, não é o que protege a escrita.
export default async function EquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const isCoordenacao = profile?.role === "coordenacao_geral";

  const supabase = await getSupabase();

  if (isCoordenacao) {
    // Pendente ainda não foi aprovado - fica só na seção dedicada em
    // Configurações, não faz sentido aparecer aqui como se já fosse parte
    // do time.
    const [{ data: areas }, { data: users }, { data: categories }] = await Promise.all([
      supabase.from("areas").select("id, name").order("name"),
      supabase
        .from("users")
        .select("id, name, email, role, area_ids, pending_area_ids, areas_submitted_at, is_protected, account_status")
        .neq("account_status", "pending")
        .order("name"),
      supabase.from("request_categories").select("id, name, area:areas(name)").order("name"),
    ]);

    const areaNameById = new Map((areas ?? []).map((a) => [a.id, a.name]));

    return (
      <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Equipe</h1>

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

        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Categorias de pedido</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
            Aparecem no formulário público de solicitação. Cada categoria roteia automaticamente pra área dona.
          </p>

          <div className="flex flex-col" style={{ gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            {(categories ?? []).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between"
                style={{ fontSize: "var(--text-sm)" }}
              >
                <span>{category.name}</span>
                <span className="badge badge-neutral">{areaName(category.area)}</span>
              </div>
            ))}
            {(categories ?? []).length === 0 && (
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                Nenhuma categoria cadastrada ainda.
              </span>
            )}
          </div>

          <form action={createCategory} className="flex items-end flex-wrap" style={{ gap: "var(--space-3)" }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label className="field-label">Nova categoria</label>
              <div className="input-wrap">
                <input type="text" name="name" placeholder="Ex: Transmissão" required />
              </div>
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label className="field-label">Área dona</label>
              <div className="input-wrap select-wrap" style={{ width: 200, flexShrink: 0 }}>
                <select name="area_id" required defaultValue="">
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {(areas ?? []).map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
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
            {(users ?? []).map((member) => {
              const isDeleted = member.account_status === "deleted";
              return (
                <div
                  key={member.id}
                  className="card flex items-center justify-between flex-wrap"
                  style={{ padding: "var(--space-5)", gap: "var(--space-4)", opacity: isDeleted ? 0.5 : 1 }}
                >
                  <div>
                    <div style={{ fontWeight: "var(--weight-semibold)", textDecoration: isDeleted ? "line-through" : "none" }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                      {member.email}
                      {isDeleted && " · Excluído"}
                    </div>
                  </div>
                  {isDeleted ? null : (
                    <div className="areas-member-actions flex items-center flex-wrap" style={{ gap: "var(--space-3)" }}>
                      <UserAssignmentRow
                        userId={member.id}
                        role={member.role}
                        areaNames={effectiveAreaIds(member)
                          .map((id) => areaNameById.get(id))
                          .filter((name): name is string => Boolean(name))}
                        disableSelf={member.id === user.id}
                        isProtected={member.is_protected}
                      />
                      {member.role === "pasconeiro" && !member.is_protected && (
                        <div className="areas-delete-wrap">
                          <DeleteUserButton userId={member.id} userName={member.name} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // Pasconeiro: diretório simples, só leitura - is_protected marca a
  // conta institucional (pascomvisitacao@gmail.com), não é uma pessoa
  // real da equipe. account_status active só - pendente ainda não faz
  // parte do time.
  const [{ data: areas }, { data: members }] = await Promise.all([
    supabase.from("areas").select("id, name").order("name"),
    supabase
      .from("users")
      .select("id, name, role, avatar_url, area_ids, pending_area_ids, areas_submitted_at")
      .eq("is_protected", false)
      .eq("account_status", "active")
      .order("name"),
  ]);
  const areaNameById = new Map((areas ?? []).map((a) => [a.id, a.name]));

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
