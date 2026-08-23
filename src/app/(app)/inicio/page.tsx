import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { CoordenacaoBento } from "./coordenacao-bento";
import { PasconeiroBento } from "./pasconeiro-bento";
import { AutoFitName } from "./auto-fit-name";
import { effectiveAreaIds } from "@/lib/effective-areas";
import "./bento.css";

// espelha calc(var(--text-2xl) + 2pt) em px, já que o auto-shrink roda em
// JS e precisa de um número - 32px (--text-2xl) + 2pt (≈2.667px)
const NAME_MAX_FONT_SIZE = 34.67;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  coordenacao_geral: "Coordenação geral",
  pasconeiro: "Pasconeiro",
};

function greeting() {
  // aproximação de horário de Brasília (UTC-3, sem horário de verão)
  const hour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
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
    .select("name, avatar_url, role, area_ids, pending_area_ids, areas_submitted_at")
    .eq("id", user.id)
    .single();

  const displayName = (profile?.name ?? user.email ?? "Usuário").split(" ")[0];
  const isCoordenacao = profile?.role === "coordenacao_geral";
  const roleLabel = profile?.role ? (ROLE_LABEL[profile.role] ?? profile.role) : "—";

  const myAreaIds = profile ? effectiveAreaIds(profile) : [];
  const { data: myAreas } =
    myAreaIds.length > 0
      ? await supabase.from("areas").select("name").in("id", myAreaIds)
      : { data: [] };
  const areaName = (myAreas ?? []).map((a) => a.name).join(", ") || "Nenhuma área selecionada ainda";

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--space-5)", marginBottom: "var(--space-8)" }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-5)", minWidth: 0 }}>
          <Link href="/perfil" aria-label="Meu perfil" style={{ flexShrink: 0, lineHeight: 0 }}>
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={64}
                height={64}
                className="avatar-photo"
                style={{ width: 64, height: 64 }}
              />
            ) : (
              <span className="avatar avatar-lg">{initials(profile?.name ?? displayName)}</span>
            )}
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.3em",
                minWidth: 0,
                marginBottom: "var(--space-2)",
              }}
            >
              <span style={{ fontSize: "calc(var(--text-2xl) - 4pt)", fontWeight: "var(--weight-regular)", flexShrink: 0 }}>
                {greeting()},
              </span>
              <AutoFitName name={displayName} maxFontSize={NAME_MAX_FONT_SIZE} />
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Aqui está o panorama da Pascom hoje.
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn-outline btn-sm">
            Sair
          </button>
        </form>
      </div>

      {isCoordenacao ? (
        <CoordenacaoBento supabase={supabase} />
      ) : (
        <PasconeiroBento
          supabase={supabase}
          userId={user.id}
          areaIds={myAreaIds}
          areaName={areaName}
          roleLabel={roleLabel}
        />
      )}
    </div>
  );
}
