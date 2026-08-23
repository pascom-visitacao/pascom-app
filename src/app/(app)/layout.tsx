import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";
import { AreaOnboardingModal } from "./area-onboarding-modal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, areas_submitted_at, name, avatar_url")
    .eq("id", user.id)
    .single();

  const isCoordenacao = profile?.role === "coordenacao_geral";
  const needsAreaOnboarding = profile?.areas_submitted_at === null;

  const { data: allAreas } = needsAreaOnboarding
    ? await supabase.from("areas").select("id, name").order("name")
    : { data: [] };

  return (
    <div className="ds-shell">
      <aside className="ds-sidebar">
        <Image
          src="/brand/pascom-horizontal-mono-negativo.svg"
          alt="Logo Pascom"
          width={132}
          height={35}
          className="ds-sidebar-logo"
        />
        <nav>
          <div className="ds-nav-group">
            <div className="ds-nav-group-title">Geral</div>
            <NavLink href="/inicio">Início</NavLink>
            <NavLink href="/tarefas">Tarefas</NavLink>
            <NavLink href="/agenda">Agenda</NavLink>
            <NavLink href="/equipamentos">Equipamentos</NavLink>
            <NavLink href="/materiais">Enviar fotos</NavLink>
            <NavLink href="/perfil">Meu perfil</NavLink>
            <NavLink href="/instalar">Instalar app</NavLink>
          </div>
          {isCoordenacao && (
            <div className="ds-nav-group">
              <div className="ds-nav-group-title">Administração</div>
              <NavLink href="/areas">Equipe &amp; Áreas</NavLink>
              <NavLink href="/configuracoes">Configurações</NavLink>
            </div>
          )}
        </nav>
      </aside>
      <main className="ds-main">{children}</main>
      <MobileNav
        isCoordenacao={isCoordenacao}
        userName={profile?.name ?? user.email ?? "Usuário"}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {needsAreaOnboarding && <AreaOnboardingModal areas={allAreas ?? []} />}
    </div>
  );
}
