import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  coordenacao_geral: "Coordenação geral",
  pasconeiro: "Pasconeiro",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, avatar_url, role, area:areas(name)")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? user.email ?? "Usuário";
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] ?? profile.role : "—";
  // Sem tipos gerados do banco (projeto Supabase ainda não existe), o
  // TS não sabe que users.area_id -> areas.id é muitos-para-um, então
  // tipa `area` como array — mas em runtime o PostgREST devolve objeto
  // único. Normaliza os dois formatos até gerarmos os tipos de verdade.
  const areaRaw = profile?.area as { name: string } | { name: string }[] | null | undefined;
  const areaName = (Array.isArray(areaRaw) ? areaRaw[0]?.name : areaRaw?.name) ?? "Sem área definida";

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--color-bg-subtle)" }}
    >
      <div
        className="card card-elevated"
        style={{ maxWidth: 480, width: "100%", padding: "var(--space-9)" }}
      >
        <div
          className="flex items-center"
          style={{ gap: "var(--space-6)", marginBottom: "var(--space-7)" }}
        >
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={64}
              height={64}
              style={{ borderRadius: "var(--radius-full)" }}
            />
          ) : (
            <span className="avatar avatar-lg">{getInitials(displayName)}</span>
          )}
          <div>
            <h1 style={{ fontSize: "var(--text-lg)" }}>{displayName}</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              {profile?.email ?? user.email}
            </p>
          </div>
        </div>

        <div className="flex" style={{ gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
          <span className="badge badge-primary">{roleLabel}</span>
          <span className="badge badge-neutral">{areaName}</span>
        </div>

        <form action={signOut}>
          <button type="submit" className="btn btn-outline btn-md">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
